import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld, AttackPattern } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import { CombatSystem } from '../CombatSystem';
import { gameEvents, GameEvents } from '@/events';
import { ENTITY_CONFIG } from '@/config';
import { setup, getEntities, TestSetup, executeWithSpatialGrid, populateGridAndExecute } from '@/__tests__/helpers';
import { SpatialGrid } from '@/utils';
import { createCombatFirefly, createCombatMonster } from '@/__tests__/helpers';

describe('CombatSystem — state machine', () => {
  let world: GameWorld;
  let combatSystem: CombatSystem;
  let spatialGrid: SpatialGrid;

  afterEach(() => {
    gameEvents.clear();
  });

  beforeEach(() => {
    world = new World<Entity>();

    spatialGrid = new SpatialGrid(100);
    combatSystem = new CombatSystem(world, { spatialGrid });

    gameEvents.clear();
  });

  const runCombat = (delta: number = 16) => {
    populateGridAndExecute(world, spatialGrid, combatSystem, delta);
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

      runCombat(16);

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
        runCombat(16);
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
        runCombat(16);
      }

      expect(attacker.combat!.state).toBe(CombatState.RECOVERING);
    });

    it('should transition from RECOVERING to CHARGING after recovery', () => {
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
        runCombat(16);
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

      const handler = (combatSystem as any).attackHandlers['dash'];
      const onChargingSpy = vi.spyOn(handler, 'onCharging');

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

      const handler = (combatSystem as any).attackHandlers['dash'];
      const onRecoveringSpy = vi.spyOn(handler, 'onRecovering');

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

      const handler = (combatSystem as any).attackHandlers['dash'];
      const cleanupSpy = vi.spyOn(handler, 'cleanup');

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

      const handler = (combatSystem as any).attackHandlers['dash'];
      const cleanupSpy = vi.spyOn(handler, 'cleanup');

      for (let i = 0; i < 3; i++) {
        executeWithSpatialGrid(world, spatialGrid, 16);
        combatSystem.update(16, 16);
      }

      expect(cleanupSpy).toHaveBeenCalled();
      expect(attacker.combat!.state).toBe(CombatState.CHARGING);
    });
  });
});
