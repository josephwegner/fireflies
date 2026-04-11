import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';

describe('Combat Components', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new World<Entity>();
  });

  describe('Health Component', () => {
    it('should store health values', () => {
      const entity = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      expect(entity.health!.currentHealth).toBe(100);
      expect(entity.health!.maxHealth).toBe(100);
      expect(entity.health!.isDead).toBe(false);
    });

    it('should allow custom health values', () => {
      const entity = world.add({
        health: { currentHealth: 50, maxHealth: 50, isDead: false }
      });

      expect(entity.health!.currentHealth).toBe(50);
      expect(entity.health!.maxHealth).toBe(50);
    });

    it('should be mutable for damage application', () => {
      const entity = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      entity.health!.currentHealth -= 25;

      expect(entity.health!.currentHealth).toBe(75);
    });
  });

  describe('Combat Component', () => {
    const defaultAttackPattern = {
      chargeTime: 1000,
      attackDuration: 300,
      recoveryTime: 400,
      damage: 10,
      handlerType: 'dash' as const,
      dashSpeed: 100,
      knockbackForce: 50
    };

    it('should store combat state values', () => {
      const entity = world.add({
        combat: {
          state: CombatState.IDLE,
          chargeTime: 0,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: defaultAttackPattern
        }
      });

      expect(entity.combat!.state).toBe(CombatState.IDLE);
      expect(entity.combat!.chargeTime).toBe(0);
      expect(entity.combat!.attackElapsed).toBe(0);
      expect(entity.combat!.recoveryElapsed).toBe(0);
      expect(entity.combat!.hasHit).toBe(false);
    });

    it('should allow setting attack pattern', () => {
      const entity = world.add({
        combat: {
          state: CombatState.IDLE,
          chargeTime: 0,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: defaultAttackPattern
        }
      });

      expect(entity.combat!.attackPattern).toEqual(defaultAttackPattern);
      expect(entity.combat!.attackPattern.handlerType).toBe('dash');
    });

    it('should support all combat states', () => {
      const entity = world.add({
        combat: {
          state: CombatState.IDLE,
          chargeTime: 0,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: defaultAttackPattern
        }
      });

      entity.combat!.state = CombatState.CHARGING;
      expect(entity.combat!.state).toBe(CombatState.CHARGING);

      entity.combat!.state = CombatState.ATTACKING;
      expect(entity.combat!.state).toBe(CombatState.ATTACKING);

      entity.combat!.state = CombatState.RECOVERING;
      expect(entity.combat!.state).toBe(CombatState.RECOVERING);

      entity.combat!.state = CombatState.IDLE;
      expect(entity.combat!.state).toBe(CombatState.IDLE);
    });
  });

  describe('Component integration', () => {
    it('should allow entity to have all combat-related components', () => {
      const entity = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        combat: {
          state: CombatState.IDLE,
          chargeTime: 0,
          attackElapsed: 0,
          recoveryElapsed: 0,
          hasHit: false,
          attackPattern: {
            chargeTime: 1000,
            attackDuration: 300,
            recoveryTime: 400,
            damage: 10,
            handlerType: 'dash' as const,
            dashSpeed: 100,
            knockbackForce: 50
          }
        }
      });

      expect(!!entity.health).toBe(true);
      expect(!!entity.combat).toBe(true);
    });
  });
});
