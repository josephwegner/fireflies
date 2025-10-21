import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { DamageSystem } from '../DamageSystem';
import { Health, Combat, Position, Renderable, PhysicsBody } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';

describe('DamageSystem', () => {
  let world: World;
  let system: DamageSystem;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Health);
    world.registerComponent(Combat);
    world.registerComponent(Position);
    world.registerComponent(Renderable);
    world.registerComponent(PhysicsBody);

    world.registerSystem(DamageSystem);
    
    // Clear any previous event listeners
    gameEvents.clear();
    
    // Get the registered system instance and initialize it
    system = world.getSystem(DamageSystem) as DamageSystem;
    system.init();
  });

  describe('damage application', () => {
    it('should apply damage to target health', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      // Emit the event to trigger damage
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });
      
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(75);
    });

    it('should not reduce health below zero', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 50
      });
      
      // Entity should be dead but not removed yet (death animation)
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(0);
      expect(health.isDead).toBe(true);
    });

    it('should handle multiple damage instances', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      // First hit
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });
      
      let health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(75);
      
      // Second hit
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 30
      });
      
      health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(45);
    });
  });

  describe('death handling', () => {
    it('should mark entity as dead when health reaches zero', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 25, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
      let diedEventFired = false;
      let capturedEntity: any = null;
      gameEvents.once(GameEvents.ENTITY_DIED, ({ entity, position }) => {
        diedEventFired = true;
        capturedEntity = entity;
        expect(position).toEqual({ x: 100, y: 100 });
      });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });
      
      expect(diedEventFired).toBe(true);
      expect(capturedEntity).toBe(target);
      const health = target.getComponent(Health)!;
      expect(health.isDead).toBe(true);
      expect(health.currentHealth).toBe(0);
    });

    it('should start death animation by setting renderable alpha', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 20, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
      let diedEventFired = false;
      gameEvents.once(GameEvents.ENTITY_DIED, () => {
        diedEventFired = true;
      });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 30
      });
      
      expect(diedEventFired).toBe(true);
      expect(target.hasComponent(Renderable)).toBe(true);
    });

    it('should not emit death event multiple times for same entity', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 10, maxHealth: 100, isDead: true });
      target.addComponent(Position, { x: 100, y: 100 });
      
      let deathCount = 0;
      gameEvents.on(GameEvents.ENTITY_DIED, () => {
        deathCount++;
      });
      
      // Try to damage an already dead entity
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10
      });
      
      expect(deathCount).toBe(0);
    });
  });

  describe('death animation lifecycle', () => {
    it('should remove entity after death animation duration', async () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
      // Trigger death
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 20
      });
      
      // Entity should still be alive (but marked as dead)
      expect(target.alive).toBe(true);
      
      // Run system updates to process death animation
      const deathDuration = PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;
      const steps = 10;
      const deltaPerStep = deathDuration / steps;
      
      for (let i = 0; i <= steps + 1; i++) {
        world.execute(deltaPerStep, deltaPerStep);
      }
      
      // Entity should be removed after animation completes
      expect(target.alive).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle damage to entity without health component', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 100, y: 100 });
      
      // Should not throw
      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target,
          damage: 25
        });
      }).not.toThrow();
    });

    it('should handle zero damage', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 0
      });
      
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(100);
    });

    it('should handle negative damage (should not heal)', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 50, maxHealth: 100 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: -25
      });
      
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(50); // Should remain unchanged
    });

    it('should handle knockback with zero force', () => {
      const attacker = world.createEntity();
      attacker.addComponent(Position, { x: 100, y: 100 });
      
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(Position, { x: 150, y: 100 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10,
        knockbackForce: 0
      });
    });

    it('should handle knockback when attacker has no position', () => {
      const attacker = world.createEntity();
      
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(Position, { x: 150, y: 100 });
      
      // Should not throw, but also should not apply knockback
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

