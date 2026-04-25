import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DamageSystem } from '../DamageSystem';
import { VictorySystem } from '../VictorySystem';
import { gameEvents, GameEvents } from '@/events';

describe('DamageSystem — damage', () => {
  let world: GameWorld;
  let system: DamageSystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    system = new DamageSystem(world, {});
    // VictorySystem subscribes to gameEvents in its constructor
    new VictorySystem(world, {});
  });

  describe('damage application', () => {
    it('should apply damage to target health', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });

      expect(target.health!.currentHealth).toBe(75);
    });

    it('should not reduce health below zero', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'test', sprite: 'test', color: 0xff0000, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 50
      });

      expect(target.health!.currentHealth).toBe(0);
      expect(target.health!.isDead).toBe(true);
    });

    it('should handle multiple damage instances', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });

      expect(target.health!.currentHealth).toBe(75);

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 30
      });

      expect(target.health!.currentHealth).toBe(45);
    });
  });

  describe('edge cases', () => {
    it('should handle damage to entity without health component', () => {
      const attacker = world.add({});
      const target = world.add({
        position: { x: 100, y: 100 }
      });

      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target,
          damage: 25
        });
      }).not.toThrow();
    });

    it('should handle zero damage', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 0
      });

      expect(target.health!.currentHealth).toBe(100);
    });

    it('should handle negative damage (should not heal)', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 50, maxHealth: 100, isDead: false }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: -25
      });

      expect(target.health!.currentHealth).toBe(50);
    });

    it('should handle knockback with zero force', () => {
      const attacker = world.add({
        position: { x: 100, y: 100 }
      });

      const target = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        position: { x: 150, y: 100 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10,
        knockbackForce: 0
      });
    });

    it('should handle knockback when attacker has no position', () => {
      const attacker = world.add({});

      const target = world.add({
        health: { currentHealth: 100, maxHealth: 100, isDead: false },
        position: { x: 150, y: 100 }
      });

      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target,
          damage: 10,
          knockbackForce: 50
        });
      }).not.toThrow();
    });
  });
});
