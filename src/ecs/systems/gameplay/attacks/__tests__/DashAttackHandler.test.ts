import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld, Combat, CombatState } from '@/ecs/Entity';
import { DashAttackHandler } from '../DashAttackHandler';
import type { AttackContext } from '../AttackHandler';
import { gameEvents, GameEvents } from '@/events';

describe('DashAttackHandler', () => {
  let handler: DashAttackHandler;
  let world: GameWorld;
  let attacker: Entity;
  let target: Entity;
  let mockCombat: Combat;

  beforeEach(() => {
    handler = new DashAttackHandler();
    world = new World<Entity>();

    attacker = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
    });

    target = world.add({
      position: { x: 100, y: 0 },
      physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 }
    });

    mockCombat = {
      state: 'ATTACKING' as CombatState,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      hasHit: false,
      attackPattern: {
        handlerType: 'dash',
        chargeTime: 1800,
        attackDuration: 500,
        recoveryTime: 600,
        damage: 10,
        knockbackForce: 50,
        dashSpeed: 100
      }
    };

    vi.clearAllMocks();
  });

  describe('Dash Attack Logic', () => {
    it('should apply dash velocity on attack start', () => {
      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.position!,
        velocity: attacker.velocity!
      };

      handler.onAttackStart?.(context);

      expect(attacker.velocity!.vx).toBeGreaterThan(0);
      expect(attacker.velocity!.vy).toBe(0);
    });

    it('should hit target when entities collide', () => {
      attacker.position!.x = 95;

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.position!,
        velocity: attacker.velocity!
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10,
        knockbackForce: 50
      });
      expect(mockCombat.hasHit).toBe(true);
    });

    it('should only hit once per attack', () => {
      attacker.position!.x = 95;

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.position!,
        velocity: attacker.velocity!
      };

      handler.execute(context);
      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('No-op Visual Methods', () => {
    it('should not throw on onCharging', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      expect(() => handler.onCharging?.(context)).not.toThrow();
    });

    it('should not throw on onRecovering', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      expect(() => handler.onRecovering?.(context)).not.toThrow();
    });

    it('should not throw on cleanup', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      expect(() => handler.cleanup?.(context)).not.toThrow();
    });
  });
});
