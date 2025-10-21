import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { Health, Combat, CombatState } from '@/ecs/components';

describe('Combat Components', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Health);
    world.registerComponent(Combat);
  });

  describe('Health Component', () => {
    it('should have correct default values', () => {
      const entity = world.createEntity();
      entity.addComponent(Health);
      
      const health = entity.getComponent(Health)!;
      expect(health.currentHealth).toBe(100);
      expect(health.maxHealth).toBe(100);
      expect(health.isDead).toBe(false);
    });

    it('should allow custom health values', () => {
      const entity = world.createEntity();
      entity.addComponent(Health, { currentHealth: 50, maxHealth: 50 });
      
      const health = entity.getComponent(Health)!;
      expect(health.currentHealth).toBe(50);
      expect(health.maxHealth).toBe(50);
    });

    it('should be mutable for damage application', () => {
      const entity = world.createEntity();
      entity.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      const health = entity.getMutableComponent(Health)!;
      health.currentHealth -= 25;
      
      expect(health.currentHealth).toBe(75);
    });
  });

  describe('Combat Component', () => {
    it('should have correct default values', () => {
      const entity = world.createEntity();
      entity.addComponent(Combat);
      
      const combat = entity.getComponent(Combat)!;
      expect(combat.state).toBe(CombatState.IDLE);
      expect(combat.chargeTime).toBe(0);
      expect(combat.attackElapsed).toBe(0);
      expect(combat.recoveryElapsed).toBe(0);
      expect(combat.hasHit).toBe(false);
    });

    it('should allow setting attack pattern', () => {
      const entity = world.createEntity();
      const attackPattern = {
        chargeTime: 1000,
        attackDuration: 300,
        recoveryTime: 400,
        damage: 10,
        attackType: 'dash' as const,
        dashSpeed: 100,
        knockbackForce: 50
      };
      
      entity.addComponent(Combat, { attackPattern });
      
      const combat = entity.getComponent(Combat)!;
      expect(combat.attackPattern).toEqual(attackPattern);
      expect(combat.attackPattern.attackType).toBe('dash');
    });

    it('should support all combat states', () => {
      const entity = world.createEntity();
      entity.addComponent(Combat);
      
      const combat = entity.getMutableComponent(Combat)!;
      
      // Test each state
      combat.state = CombatState.CHARGING;
      expect(combat.state).toBe(CombatState.CHARGING);
      
      combat.state = CombatState.ATTACKING;
      expect(combat.state).toBe(CombatState.ATTACKING);
      
      combat.state = CombatState.RECOVERING;
      expect(combat.state).toBe(CombatState.RECOVERING);
      
      combat.state = CombatState.IDLE;
      expect(combat.state).toBe(CombatState.IDLE);
    });
  });

  describe('Knockback Component', () => {
    it('should have correct default values', () => {
      const entity = world.createEntity();
      entity.addComponent(Knockback);
      
      const knockback = entity.getComponent(Knockback)!;
      expect(knockback.force).toEqual({ x: 0, y: 0 });
      expect(knockback.duration).toBe(0);
      expect(knockback.elapsed).toBe(0);
    });

    it('should allow setting knockback force', () => {
      const entity = world.createEntity();
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });
      
      const knockback = entity.getComponent(Knockback)!;
      expect(knockback.force.x).toBe(50);
      expect(knockback.force.y).toBe(30);
      expect(knockback.duration).toBe(200);
    });

    it('should be mutable for time tracking', () => {
      const entity = world.createEntity();
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });
      
      const knockback = entity.getMutableComponent(Knockback)!;
      knockback.elapsed += 16;
      
      expect(knockback.elapsed).toBe(16);
    });
  });

  describe('Component integration', () => {
    it('should allow entity to have all combat-related components', () => {
      const entity = world.createEntity();
      
      entity.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      entity.addComponent(Combat, {
        state: CombatState.IDLE,
        attackPattern: {
          chargeTime: 1000,
          attackDuration: 300,
          recoveryTime: 400,
          damage: 10,
          attackType: 'dash',
          dashSpeed: 100,
          knockbackForce: 50
        }
      });
      entity.addComponent(Knockback, { force: { x: 0, y: 0 }, duration: 0, elapsed: 0 });
      
      expect(entity.hasComponent(Health)).toBe(true);
      expect(entity.hasComponent(Combat)).toBe(true);
      expect(entity.hasComponent(Knockback)).toBe(true);
    });
  });
});

