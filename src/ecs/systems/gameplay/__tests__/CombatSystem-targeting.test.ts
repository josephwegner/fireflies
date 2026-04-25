import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld, AttackPattern } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import { CombatSystem } from '../CombatSystem';
import { gameEvents, GameEvents } from '@/events';
import { ENTITY_CONFIG } from '@/config';
import { setup, TestSetup, executeWithSpatialGrid, populateGridAndExecute } from '@/__tests__/helpers';
import { SpatialGrid } from '@/utils';

const MOCK_PULSE_PATTERN: AttackPattern = {
  handlerType: 'pulse',
  chargeTime: 100,
  attackDuration: 200,
  recoveryTime: 300,
  damage: 10,
  knockbackForce: 50,
  radius: 50,
};

describe('CombatSystem — targeting', () => {
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

      runCombat(16);

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

      runCombat(16);

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

      runCombat(16);

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
        runCombat(16);
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
        runCombat(16);
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
        runCombat(16);
      }).not.toThrow();
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
});
