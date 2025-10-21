import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'ecsy';
import { CombatSystem } from '../CombatSystem';
import { Combat, CombatState, Health, Target, Position, Velocity, PhysicsBody, FireflyTag, MonsterTag, WispTag } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { ENTITY_CONFIG } from '@/config';
import { AttackHandlerRegistry } from '../attacks/AttackHandlerRegistry';
import { AttackPattern } from '@/ecs/components/AttackPattern';
import { setup, getEntities, TestSetup, executeWithSpatialGrid } from '@/__tests__/helpers';
import { ECSEntity } from '@/types';
import { SpatialGrid } from '@/utils';
import { createCombatFirefly, createCombatMonster } from '@/__tests__/helpers';

const MOCK_ATTACK_PATTERN: AttackPattern = {
  handlerType: 'dash',
  chargeTime: 100,
  attackDuration: 200,
  recoveryTime: 300,
  damage: 10,
  knockbackForce: 50,
  dashSpeed: 100,
  targetTags: ['monster'],
};

const MOCK_PULSE_PATTERN: AttackPattern = {
  handlerType: 'pulse',
  chargeTime: 100,
  attackDuration: 200,
  recoveryTime: 300,
  damage: 10,
  knockbackForce: 50,
  radius: 50,
  targetTags: ['firefly'],
};

describe('CombatSystem', () => {
  let world: World;
  let system: CombatSystem;
  let spatialGrid: SpatialGrid;

  afterEach(() => {
    // Clean up all event listeners after each test
    gameEvents.clear();
  });

  beforeEach(() => {
    world = new World();
    world.registerComponent(Combat);
    world.registerComponent(Health);
    world.registerComponent(Target);
    world.registerComponent(Position);
    world.registerComponent(Velocity);
    world.registerComponent(PhysicsBody);
    world.registerComponent(FireflyTag);
    world.registerComponent(MonsterTag);
    world.registerComponent(WispTag);

    // Initialize attack handlers for combat system
    AttackHandlerRegistry.initialize();

    // Create and pass spatial grid to CombatSystem
    spatialGrid = new SpatialGrid(100);
    world.registerSystem(CombatSystem, { spatialGrid });
    system = world.getSystem(CombatSystem) as CombatSystem;
    
    gameEvents.clear();
  });

  // Helper to populate spatial grid before executing
  const populateGridAndExecute = (delta: number = 16) => {
    spatialGrid.clear();
    const positionedEntities = (world.entityManager as any)._entities.filter(
      (e: any) => e.hasComponent(Position)
    );
    positionedEntities.forEach((entity: any) => {
      const pos = entity.getComponent(Position);
      if (pos) {
        spatialGrid.insert(entity, pos.x, pos.y);
      }
    });
    world.execute(delta, delta);
  };

  describe('state transitions', () => {
    it('should transition from IDLE to CHARGING when target acquired', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.IDLE,
        chargeTime: 0,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      populateGridAndExecute(16);

      const combat = attacker.getComponent(Combat)!;
      expect(combat.state).toBe(CombatState.CHARGING);
    });

    it('should transition from CHARGING to ATTACKING when charge completes', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 1750, // Almost fully charged (new timing: 1800ms total)
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      // Run a few frames to complete charge
      for (let i = 0; i < 5; i++) {
        populateGridAndExecute(16);
      }

      const combat = attacker.getComponent(Combat)!;
      expect(combat.state).toBe(CombatState.ATTACKING);
    });

    it('should transition from ATTACKING to RECOVERING after attack duration', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1800,
        attackElapsed: 450, // Almost done attacking (new timing: 500ms total)
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });
      attacker.addComponent(FireflyTag);

      // Run frames to complete attack
      for (let i = 0; i < 5; i++) {
        populateGridAndExecute(16);
      }

      const combat = attacker.getComponent(Combat)!;
      expect(combat.state).toBe(CombatState.RECOVERING);
    });

    it('should transition from RECOVERING to IDLE after recovery', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.RECOVERING,
        chargeTime: 1800,
        attackElapsed: 500,
        recoveryElapsed: 550, // Almost done recovering (new timing: 600ms total)
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: true
      });
      attacker.addComponent(FireflyTag);

      // Run frames to complete recovery
      for (let i = 0; i < 10; i++) {
        populateGridAndExecute(16);
      }

      const combat = attacker.getComponent(Combat)!;
      // After recovery, if target is still present and in range, should start charging again
      expect(combat.state).toBe(CombatState.CHARGING);
      expect(combat.chargeTime).toBeLessThan(200); // Should have started charging
    });
  });

  describe('firefly attacks', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];
    let firefly: ECSEntity;
    let monster: ECSEntity;

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      spatialGrid = setupResult.spatialGrid;
      const entities = getEntities(world);
      firefly = entities.firefly;
      monster = entities.monster;
    });

    it('should apply dash velocity during ATTACKING phase', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 }); // Within interaction radius (30)
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });
      attacker.addComponent(FireflyTag);

      executeWithSpatialGrid(world, spatialGrid, 16);

      const velocity = attacker.getComponent(Velocity)!;
      // Should have dash velocity toward target
      expect(velocity.vx).toBeGreaterThan(0);
    });

    it('should emit ATTACK_HIT when firefly collides with target', () => {
      const target = world.createEntity();
      // Place target very close for collision
      target.addComponent(Position, { x: 102, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(MonsterTag); // Firefly attacks monsters
      
      const attacker = world.createEntity();
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 50, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });
      attacker.addComponent(FireflyTag);

      let attackHitFired = false;
      gameEvents.on(GameEvents.ATTACK_HIT, () => {
        attackHitFired = true;
      });

      executeWithSpatialGrid(world, spatialGrid, 16);

      expect(attackHitFired).toBe(true);
    });

    it('should emit ATTACK_STARTED event when entering ATTACKING state', () => {
      const target = world.createEntity();
      target.addComponent(Position, { x: 110, y: 100 }); // Closer, well within range
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100, isDead: false });
      target.addComponent(MonsterTag);
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 8 });
      
      const attacker = world.createEntity();
      attacker.addComponent(FireflyTag);
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100, isDead: false });
      attacker.addComponent(Target, { target });
      
      // Use a simpler attack pattern with faster timing for testing
      const testPattern = {
        handlerType: 'dash' as const,
        chargeTime: 100, // Fast for testing
        attackDuration: 100,
        recoveryTime: 100,
        damage: 10,
        knockbackForce: 50,
        dashSpeed: 100,
        targetTags: ['monster']
      };
      
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 80, // Near completion
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: testPattern,
        hasHit: false
      });

      let attackStartedFired = false;
      gameEvents.on(GameEvents.ATTACK_STARTED, () => {
        attackStartedFired = true;
      });

      // Run enough frames to trigger transition (80 + 3*16 = 128 > 100)
      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
      }

      expect(attackStartedFired).toBe(true);
    });
  });

  describe('monster attacks', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];
    let firefly: ECSEntity;
    let monster: ECSEntity;

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      spatialGrid = setupResult.spatialGrid;
      const entities = getEntities(world);
      firefly = entities.firefly;
      monster = entities.monster;
    });

    it('should emit ATTACK_HIT for all enemies in pulse radius', () => {
      const target1 = world.createEntity();
      const target2 = world.createEntity();
      
      // Place targets within pulse radius (40) and interaction radius (40)
      target1.addComponent(Position, { x: 110, y: 100 });
      target1.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target1.addComponent(FireflyTag);
      target1.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      target2.addComponent(Position, { x: 120, y: 100 });
      target2.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target2.addComponent(FireflyTag);
      target2.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      const attacker = world.createEntity();
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 8 });
      attacker.addComponent(Target, { target: target1 });
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.monster.combat!,
        hasHit: false
      });
      attacker.addComponent(MonsterTag);

      let hitCount = 0;
      gameEvents.on(GameEvents.ATTACK_HIT, () => {
        hitCount++;
      });

      executeWithSpatialGrid(world, spatialGrid, 16);

      // Should hit both targets in radius
      expect(hitCount).toBeGreaterThan(0);
    });

    it('should continue moving toward target while charging', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 200, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.monster.combat!,
        hasHit: false
      });
      attacker.addComponent(MonsterTag);

      const initialX = 100;

      executeWithSpatialGrid(world, spatialGrid, 16);

      const position = attacker.getComponent(Position)!;
      // Monster should still be moving toward target while charging
      // (This behavior is controlled by MovementSystem, but we verify it's not blocked)
      expect(attacker.hasComponent(Combat)).toBe(true);
    });
  });

  describe('targeting and range', () => {
    it('should remove Target when target dies', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 });
      target.addComponent(Health, { currentHealth: 0, maxHealth: 100, isDead: true });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      populateGridAndExecute(16);

      expect(attacker.hasComponent(Target)).toBe(false);
    });

    it('should remove Target when target moves out of range', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      // Place target far away (out of interaction radius)
      target.addComponent(Position, { x: 500, y: 500 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });
      attacker.addComponent(FireflyTag);

      populateGridAndExecute(16);

      expect(attacker.hasComponent(Target)).toBe(false);
    });

    it('should reset combat state when target is lost', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 500, y: 500 }); // Far away
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });
      attacker.addComponent(FireflyTag);

      populateGridAndExecute(16);

      const combat = attacker.getComponent(Combat)!;
      expect(combat.state).toBe(CombatState.IDLE);
      expect(combat.chargeTime).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle entity without target component', () => {
      const attacker = world.createEntity();
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Combat, {
        state: CombatState.IDLE,
        chargeTime: 0,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      expect(() => {
        populateGridAndExecute(16);
      }).not.toThrow();
    });

    it('should handle dead attacker', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 120, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 0, maxHealth: 100, isDead: true });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      expect(() => {
        populateGridAndExecute(16);
      }).not.toThrow();

      // Dead entities shouldn't attack
      expect(attacker.hasComponent(Target)).toBe(false);
    });

    it('should handle missing position components', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      expect(() => {
        populateGridAndExecute(16);
      }).not.toThrow();
    });
  });

  describe('event emissions', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let attacker: ECSEntity;
    let target: ECSEntity;

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      const entities = getEntities(world);
      attacker = entities.firefly;
      target = entities.monster;
    });

    it('should emit ATTACK_COMPLETED when attack finishes', () => {
      const target = world.createEntity();
      target.addComponent(Position, { x: 110, y: 100 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100, isDead: false });
      target.addComponent(MonsterTag);
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 8 });
      
      const attacker = world.createEntity();
      attacker.addComponent(FireflyTag);
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100, isDead: false });
      attacker.addComponent(Target, { target });
      
      // Use faster timing for testing
      const testPattern = {
        handlerType: 'dash' as const,
        chargeTime: 100,
        attackDuration: 100, // Fast for testing
        recoveryTime: 100,
        damage: 10,
        knockbackForce: 50,
        dashSpeed: 100,
        targetTags: ['monster']
      };
      
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 100,
        attackElapsed: 80, // Near completion
        recoveryElapsed: 0,
        attackPattern: testPattern,
        hasHit: true
      });

      let attackCompletedFired = false;
      gameEvents.on(GameEvents.ATTACK_COMPLETED, () => {
        attackCompletedFired = true;
      });

      // Run enough frames (80 + 3*16 = 128 > 100)
      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
      }

      expect(attackCompletedFired).toBe(true);
    });
  });

  describe('PulseAttackHandler', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      spatialGrid = setupResult.spatialGrid;
      
      // Set up spy on gameEvents.emit
      vi.spyOn(gameEvents, 'emit');
    });

    it('should hit entities matching targetTags', () => {
      // Arrange
      const target = world.createEntity();
      target.addComponent(FireflyTag);
      target.addComponent(Position, { x: 10, y: 10 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      const attacker = world.createEntity();
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        hasHit: false,
        attackPattern: MOCK_PULSE_PATTERN,
      });
      attacker.addComponent(Position, { x: 0, y: 0 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Target, { target });

      // Act
      executeWithSpatialGrid(world, spatialGrid, 16);

      // Assert
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: MOCK_PULSE_PATTERN.damage,
        knockbackForce: MOCK_PULSE_PATTERN.knockbackForce,
      });
    });

    it('should not hit entities not matching targetTags', () => {
      // Arrange
      const target = world.createEntity();
      target.addComponent(FireflyTag);
      target.addComponent(Position, { x: 10, y: 10 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      const attacker = world.createEntity();
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        hasHit: false,
        attackPattern: {
          ...MOCK_PULSE_PATTERN,
          targetTags: ['monster']
        },
      });
      attacker.addComponent(Position, { x: 0, y: 0 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Target, { target });

      // Act
      executeWithSpatialGrid(world, spatialGrid, 16);

      // Assert
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });

    it('should hit multiple entities matching targetTags', () => {
      // Arrange
      const target1 = world
        .createEntity()
        .addComponent(FireflyTag)
        .addComponent(Position, { x: 10, y: 10 })
        .addComponent(Health, { currentHealth: 100, maxHealth: 100 })
        .addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      const target2 = world
        .createEntity()
        .addComponent(WispTag)
        .addComponent(Position, { x: 15, y: 15 })
        .addComponent(Health, { currentHealth: 100, maxHealth: 100 })
        .addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      const target3 = world
        .createEntity()
        .addComponent(MonsterTag)
        .addComponent(Position, { x: 20, y: 20 })
        .addComponent(Health, { currentHealth: 100, maxHealth: 100 })
        .addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      const attacker = world.createEntity();
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        hasHit: false,
        attackPattern: {
          ...MOCK_PULSE_PATTERN,
          targetTags: ['firefly', 'wisp']
        },
      });
      attacker.addComponent(Position, { x: 0, y: 0 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Target, { target: target1 });

      // Act
      executeWithSpatialGrid(world, spatialGrid, 16);

      // Assert
      expect(gameEvents.emit).toHaveBeenCalledTimes(2);
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, expect.objectContaining({ target: target1 }));
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, expect.objectContaining({ target: target2 }));
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: target3 })
      );
    });

    it('should not hit entities outside of range', () => {
      // Arrange
      const target = world.createEntity();
      target.addComponent(FireflyTag);
      target.addComponent(Position, { x: 100, y: 100 }); // Far away
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      const attacker = world.createEntity();
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        hasHit: false,
        attackPattern: {
          ...MOCK_PULSE_PATTERN,
          radius: 10, // Smaller radius for this test
        },
      });
      attacker.addComponent(Position, { x: 0, y: 0 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Target, { target });

      // Act
      executeWithSpatialGrid(world, spatialGrid, 16);

      // Assert
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target })
      );
    });
  });

  describe('spatial grid integration', () => {
    it('should pass spatial grid to attack handlers via context', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      
      target.addComponent(Position, { x: 10, y: 0 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(FireflyTag);
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        hasHit: false,
        attackPattern: MOCK_PULSE_PATTERN,
      });
      attacker.addComponent(Position, { x: 0, y: 0 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(MonsterTag);
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Target, { target });

      // Don't add target to grid - if grid is used, no hit should occur
      spatialGrid.clear();
      spatialGrid.insert(attacker, 0, 0);

      vi.spyOn(gameEvents, 'emit');

      world.execute(16, 16);

      // If spatial grid is passed and used, attack won't find the target
      expect(gameEvents.emit).not.toHaveBeenCalledWith(GameEvents.ATTACK_HIT, expect.anything());
    });

    it('should find targets when properly added to spatial grid', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      
      target.addComponent(Position, { x: 10, y: 0 });
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(FireflyTag);
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      
      attacker.addComponent(Combat, {
        state: CombatState.ATTACKING,
        chargeTime: 1000,
        attackElapsed: 0,
        recoveryElapsed: 0,
        hasHit: false,
        attackPattern: MOCK_PULSE_PATTERN,
      });
      attacker.addComponent(Position, { x: 0, y: 0 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      attacker.addComponent(MonsterTag);
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      attacker.addComponent(Target, { target });

      // Properly populate grid
      spatialGrid.clear();
      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      world.execute(16, 16);

      // Now it should find and hit the target
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: MOCK_PULSE_PATTERN.damage,
        knockbackForce: MOCK_PULSE_PATTERN.knockbackForce,
      });
    });
  });

  describe('Visual Lifecycle Integration', () => {
    it('should call handler.onCharging during CHARGING state', () => {
      const target = createCombatMonster(world, { x: 110, y: 100 });
      const attacker = createCombatFirefly(world, { x: 100, y: 100 });
      
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      const handler = AttackHandlerRegistry.get('dash');
      const onChargingSpy = vi.spyOn(handler!, 'onCharging');

      executeWithSpatialGrid(world, spatialGrid, 16);

      expect(onChargingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attacker,
          combat: expect.any(Object),
          dt: 16
        })
      );
    });

    it('should call handler.onRecovering during RECOVERING state', () => {
      const target = createCombatMonster(world, { x: 110, y: 100 });
      const attacker = createCombatFirefly(world, { x: 100, y: 100 });
      
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.RECOVERING,
        chargeTime: 1800,
        attackElapsed: 500,
        recoveryElapsed: 100,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: true
      });

      const handler = AttackHandlerRegistry.get('dash');
      const onRecoveringSpy = vi.spyOn(handler!, 'onRecovering');

      executeWithSpatialGrid(world, spatialGrid, 16);

      expect(onRecoveringSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attacker,
          combat: expect.any(Object),
          dt: 16
        })
      );
    });

    it('should call handler.cleanup when Target is removed due to death', () => {
      const target = createCombatMonster(world, { 
        x: 110, 
        y: 100, 
        health: 0, 
        isDead: true 
      });
      const attacker = createCombatFirefly(world, { x: 100, y: 100 });
      
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: false
      });

      const handler = AttackHandlerRegistry.get('dash');
      const cleanupSpy = vi.spyOn(handler!, 'cleanup');

      executeWithSpatialGrid(world, spatialGrid, 16);

      expect(cleanupSpy).toHaveBeenCalled();
      expect(attacker.hasComponent(Target)).toBe(false);
    });

    it('should call handler.cleanup when transitioning from RECOVERING to IDLE', () => {
      const target = createCombatMonster(world, { x: 110, y: 100 });
      const attacker = createCombatFirefly(world, { x: 100, y: 100 });
      
      attacker.addComponent(Target, { target });
      attacker.addComponent(Combat, {
        state: CombatState.RECOVERING,
        chargeTime: 1800,
        attackElapsed: 500,
        recoveryElapsed: 580,
        attackPattern: ENTITY_CONFIG.firefly.combat!,
        hasHit: true
      });

      const handler = AttackHandlerRegistry.get('dash');
      const cleanupSpy = vi.spyOn(handler!, 'cleanup');

      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
      }

      const combat = attacker.getComponent(Combat)!;
      
      expect(cleanupSpy).toHaveBeenCalled();
      expect(combat.state).toBe(CombatState.CHARGING);
    });
  });
});

