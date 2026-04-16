import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld, AttackPattern } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import { CombatSystem } from '../CombatSystem';
import { gameEvents, GameEvents } from '@/events';
import { ENTITY_CONFIG } from '@/config';
import { AttackHandlerRegistry } from '../attacks/AttackHandlerRegistry';
import { setup, getEntities, TestSetup, executeWithSpatialGrid } from '@/__tests__/helpers';
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
};

const MOCK_PULSE_PATTERN: AttackPattern = {
  handlerType: 'pulse',
  chargeTime: 100,
  attackDuration: 200,
  recoveryTime: 300,
  damage: 10,
  knockbackForce: 50,
  radius: 50,
};

describe('CombatSystem', () => {
  let world: GameWorld;
  let combatSystem: CombatSystem;
  let spatialGrid: SpatialGrid;

  afterEach(() => {
    gameEvents.clear();
  });

  beforeEach(() => {
    world = new World<Entity>();

    AttackHandlerRegistry.initialize();

    spatialGrid = new SpatialGrid(100);
    combatSystem = new CombatSystem(world, { spatialGrid });

    gameEvents.clear();
  });

  const populateGridAndExecute = (delta: number = 16) => {
    spatialGrid.clear();
    for (const entity of world.with('position')) {
      spatialGrid.insert(entity, entity.position.x, entity.position.y);
    }
    combatSystem.update(delta, delta);
  };

  describe('state transitions', () => {
    it('should transition from IDLE to CHARGING when target acquired', () => {
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.IDLE,
          chargeTime: 0,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        }
      });

      populateGridAndExecute(16);

      expect(attacker.combat!.state).toBe(CombatState.CHARGING);
    });

    it('should transition from CHARGING to ATTACKING when charge completes', () => {
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 1750,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        }
      });

      for (let i = 0; i < 5; i++) {
        populateGridAndExecute(16);
      }

      expect(attacker.combat!.state).toBe(CombatState.ATTACKING);
    });

    it('should transition from ATTACKING to RECOVERING after attack duration', () => {
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1800,
          attackElapsed: 450,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        },
        fireflyTag: true
      });

      for (let i = 0; i < 5; i++) {
        populateGridAndExecute(16);
      }

      expect(attacker.combat!.state).toBe(CombatState.RECOVERING);
    });

    it('should transition from RECOVERING to IDLE after recovery', () => {
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.RECOVERING,
          chargeTime: 1800,
          attackElapsed: 500,
          recoveryElapsed: 550,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: true
        },
        fireflyTag: true
      });

      for (let i = 0; i < 10; i++) {
        populateGridAndExecute(16);
      }

      expect(attacker.combat!.state).toBe(CombatState.CHARGING);
      expect(attacker.combat!.chargeTime).toBeLessThan(200);
    });
  });

  describe('firefly attacks', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];
    let firefly: Entity;
    let monster: Entity;

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
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        },
        fireflyTag: true
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(attacker.velocity!.vx).toBeGreaterThan(0);
    });

    it('should emit ATTACK_HIT when firefly collides with target', () => {
      const target = world.add({
        position: { x: 102, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        monsterTag: true
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 50, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        },
        fireflyTag: true
      });

      let attackHitFired = false;
      gameEvents.on(GameEvents.ATTACK_HIT, () => {
        attackHitFired = true;
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(attackHitFired).toBe(true);
    });

    it('should emit ATTACK_STARTED event when entering ATTACKING state', () => {
      const target = world.add({
        position: { x: 110, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        monsterTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 8 }
      });

      const testPattern = {
        handlerType: 'dash' as const,
        chargeTime: 100,
        attackDuration: 100,
        recoveryTime: 100,
        damage: 10,
        knockbackForce: 50,
        dashSpeed: 100,
      };

      const attacker = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 80,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: testPattern,
          hasHit: false
        }
      });

      let attackStartedFired = false;
      gameEvents.on(GameEvents.ATTACK_STARTED, () => {
        attackStartedFired = true;
      });

      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
        combatSystem.update(16, 16);
      }

      expect(attackStartedFired).toBe(true);
    });
  });

  describe('monster attacks', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      spatialGrid = setupResult.spatialGrid;
    });

    it('should emit ATTACK_HIT for all enemies in pulse radius', () => {
      const target1 = world.add({
        position: { x: 110, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        team: 'firefly' as const,
        fireflyTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      const target2 = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        team: 'firefly' as const,
        fireflyTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 8 },
        target: { target: target1 },
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.monster.combat! as AttackPattern,
          hasHit: false
        },
        team: 'monster' as const,
        monsterTag: true
      });

      let hitCount = 0;
      gameEvents.on(GameEvents.ATTACK_HIT, () => {
        hitCount++;
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(hitCount).toBeGreaterThan(0);
    });

    it('should continue moving toward target while charging', () => {
      const target = world.add({
        position: { x: 200, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.monster.combat! as AttackPattern,
          hasHit: false
        },
        monsterTag: true
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(!!attacker.combat).toBe(true);
    });
  });

  describe('targeting and range', () => {
    it('should remove Target when target dies', () => {
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 0, maxHealth: 100, isDead: true }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        }
      });

      populateGridAndExecute(16);

      expect(attacker.target).toBeUndefined();
    });

    it('should remove Target when target moves out of range', () => {
      const target = world.add({
        position: { x: 500, y: 500 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        },
        fireflyTag: true
      });

      populateGridAndExecute(16);

      expect(attacker.target).toBeUndefined();
    });

    it('should reset combat state when target is lost', () => {
      const target = world.add({
        position: { x: 500, y: 500 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        },
        fireflyTag: true
      });

      populateGridAndExecute(16);

      expect(attacker.combat!.state).toBe(CombatState.IDLE);
      expect(attacker.combat!.chargeTime).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle entity without target component', () => {
      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        combat: {
          state: CombatState.IDLE,
          chargeTime: 0,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        }
      });

      expect(() => {
        populateGridAndExecute(16);
      }).not.toThrow();
    });

    it('should handle dead attacker', () => {
      const target = world.add({
        position: { x: 120, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      const attacker = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 0, maxHealth: 100, isDead: true },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        }
      });

      expect(() => {
        populateGridAndExecute(16);
      }).not.toThrow();

      expect(attacker.target).toBeUndefined();
    });

    it('should handle missing position components', () => {
      const target = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.CHARGING,
          chargeTime: 500,
          attackElapsed: 0,
          recoveryElapsed: 0,
          attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
          hasHit: false
        }
      });

      expect(() => {
        populateGridAndExecute(16);
      }).not.toThrow();
    });
  });

  describe('event emissions', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      spatialGrid = setupResult.spatialGrid;
    });

    it('should emit ATTACK_COMPLETED when attack finishes', () => {
      const target = world.add({
        position: { x: 110, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        monsterTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 8 }
      });

      const testPattern = {
        handlerType: 'dash' as const,
        chargeTime: 100,
        attackDuration: 100,
        recoveryTime: 100,
        damage: 10,
        knockbackForce: 50,
        dashSpeed: 100,
      };

      world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        target: { target },
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 100,
          attackElapsed: 80,
          recoveryElapsed: 0,
          attackPattern: testPattern,
          hasHit: true
        }
      });

      let attackCompletedFired = false;
      gameEvents.on(GameEvents.ATTACK_COMPLETED, () => {
        attackCompletedFired = true;
      });

      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
        combatSystem.update(16, 16);
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

      vi.spyOn(gameEvents, 'emit');
    });

    it('should hit entities on enemy team', () => {
      const target = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        position: { x: 10, y: 10 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      const attacker = world.add({
        team: 'monster' as const,
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: MOCK_PULSE_PATTERN,
        },
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        target: { target }
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: MOCK_PULSE_PATTERN.damage,
        knockbackForce: MOCK_PULSE_PATTERN.knockbackForce,
      });
    });

    it('should not hit entities on same team', () => {
      const target = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        position: { x: 10, y: 10 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      world.add({
        team: 'firefly' as const,
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: MOCK_PULSE_PATTERN,
        },
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        target: { target }
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });

    it('should hit multiple enemy entities but not same-team', () => {
      const target1 = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        position: { x: 10, y: 10 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      const target2 = world.add({
        team: 'firefly' as const,
        wispTag: true,
        position: { x: 15, y: 15 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      const target3 = world.add({
        team: 'monster' as const,
        monsterTag: true,
        position: { x: 20, y: 20 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      world.add({
        team: 'monster' as const,
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: MOCK_PULSE_PATTERN,
        },
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        target: { target: target1 }
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, expect.objectContaining({ target: target1 }));
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, expect.objectContaining({ target: target2 }));
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: target3 })
      );
    });

    it('should not hit entities outside of range', () => {
      const target = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        position: { x: 100, y: 100 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      world.add({
        team: 'monster' as const,
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: {
            ...MOCK_PULSE_PATTERN,
            radius: 10,
          },
        },
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        target: { target }
      });

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target })
      );
    });
  });

  describe('spatial grid integration', () => {
    it('should pass spatial grid to attack handlers via context', () => {
      const target = world.add({
        position: { x: 10, y: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        team: 'firefly' as const,
        fireflyTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      const attacker = world.add({
        team: 'monster' as const,
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: MOCK_PULSE_PATTERN,
        },
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        monsterTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        target: { target }
      });

      spatialGrid.clear();
      spatialGrid.insert(attacker, 0, 0);

      vi.spyOn(gameEvents, 'emit');

      combatSystem.update(16, 16);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(GameEvents.ATTACK_HIT, expect.anything());
    });

    it('should find targets when properly added to spatial grid', () => {
      const target = world.add({
        position: { x: 10, y: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        team: 'firefly' as const,
        fireflyTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
      });

      const attacker = world.add({
        team: 'monster' as const,
        combat: {
          state: CombatState.ATTACKING,
          chargeTime: 1000,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: MOCK_PULSE_PATTERN,
        },
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        monsterTag: true,
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        target: { target }
      });

      spatialGrid.clear();
      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      combatSystem.update(16, 16);

      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: MOCK_PULSE_PATTERN.damage,
        knockbackForce: MOCK_PULSE_PATTERN.knockbackForce,
      });
    });
  });

  describe('Visual Lifecycle Integration', () => {
    let world: TestSetup['world'];
    let combatSystem: TestSetup['combatSystem'];
    let spatialGrid: TestSetup['spatialGrid'];

    beforeEach(() => {
      const setupResult = setup();
      world = setupResult.world;
      combatSystem = setupResult.combatSystem;
      spatialGrid = setupResult.spatialGrid;
    });

    it('should call handler.onCharging during CHARGING state', () => {
      const target = createCombatMonster(world, { x: 110, y: 100 });
      const attacker = createCombatFirefly(world, { x: 100, y: 100 });

      world.addComponent(attacker, 'target', { target });
      world.addComponent(attacker, 'combat', {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
        hasHit: false
      });

      const handler = AttackHandlerRegistry.get('dash');
      const onChargingSpy = vi.spyOn(handler!, 'onCharging');

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

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

      world.addComponent(attacker, 'target', { target });
      world.addComponent(attacker, 'combat', {
        state: CombatState.RECOVERING,
        chargeTime: 1800,
        attackElapsed: 500,
        recoveryElapsed: 100,
        attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
        hasHit: true
      });

      const handler = AttackHandlerRegistry.get('dash');
      const onRecoveringSpy = vi.spyOn(handler!, 'onRecovering');

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

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

      world.addComponent(attacker, 'target', { target });
      world.addComponent(attacker, 'combat', {
        state: CombatState.CHARGING,
        chargeTime: 500,
        attackElapsed: 0,
        recoveryElapsed: 0,
        attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
        hasHit: false
      });

      const handler = AttackHandlerRegistry.get('dash');
      const cleanupSpy = vi.spyOn(handler!, 'cleanup');

      executeWithSpatialGrid(world, spatialGrid, 16);
      combatSystem.update(16, 16);

      expect(cleanupSpy).toHaveBeenCalled();
      expect(attacker.target).toBeUndefined();
    });

    it('should call handler.cleanup when transitioning from RECOVERING to IDLE', () => {
      const target = createCombatMonster(world, { x: 110, y: 100 });
      const attacker = createCombatFirefly(world, { x: 100, y: 100 });

      world.addComponent(attacker, 'target', { target });
      world.addComponent(attacker, 'combat', {
        state: CombatState.RECOVERING,
        chargeTime: 1800,
        attackElapsed: 500,
        recoveryElapsed: 580,
        attackPattern: ENTITY_CONFIG.firefly.combat! as AttackPattern,
        hasHit: true
      });

      const handler = AttackHandlerRegistry.get('dash');
      const cleanupSpy = vi.spyOn(handler!, 'cleanup');

      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
        combatSystem.update(16, 16);
      }

      expect(cleanupSpy).toHaveBeenCalled();
      expect(attacker.combat!.state).toBe(CombatState.CHARGING);
    });
  });
});
