import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { KnockbackSystem } from '../KnockbackSystem';
import { Knockback, Position, Velocity, PhysicsBody, Wall } from '@/ecs/components';
import { PHYSICS_CONFIG } from '@/config';

describe('KnockbackSystem', () => {
  let world: World;
  let system: KnockbackSystem;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Knockback);
    world.registerComponent(Position);
    world.registerComponent(Velocity);
    world.registerComponent(PhysicsBody);
    world.registerComponent(Wall);

    world.registerSystem(KnockbackSystem);
    system = world.getSystem(KnockbackSystem) as KnockbackSystem;
  });

  describe('knockback application', () => {
    it('should apply knockback force to velocity', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      const velocity = entity.getComponent(Velocity)!;
      // Velocity should be affected by knockback force
      expect(velocity.vx).not.toBe(0);
      expect(velocity.vy).not.toBe(0);
    });

    it('should update elapsed time', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      const knockback = entity.getComponent(Knockback)!;
      expect(knockback.elapsed).toBe(16);
    });

    it('should apply friction to knockback force', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 100, y: 100 },
        duration: 200,
        elapsed: 0
      });

      // Run multiple frames
      for (let i = 0; i < 5; i++) {
        world.execute(16, 16);
      }

      const knockback = entity.getComponent(Knockback)!;
      // Force should be reduced by friction
      expect(Math.abs(knockback.force.x)).toBeLessThan(100);
      expect(Math.abs(knockback.force.y)).toBeLessThan(100);
    });

    it('should respect max velocity limit', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 500, y: 500 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      const velocity = entity.getComponent(Velocity)!;
      const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);
      expect(speed).toBeLessThanOrEqual(PHYSICS_CONFIG.MAX_KNOCKBACK_VELOCITY);
    });
  });

  describe('duration handling', () => {
    it('should remove knockback component when duration expires', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 50,
        elapsed: 0
      });

      // Execute enough frames to exceed duration
      for (let i = 0; i < 5; i++) {
        world.execute(16, 16);
      }

      expect(entity.hasComponent(Knockback)).toBe(false);
    });

    it('should not remove knockback component before duration expires', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      expect(entity.hasComponent(Knockback)).toBe(true);
    });
  });

  describe('wall collision detection', () => {
    it('should stop entity at wall', () => {
      // Create a wall entity
      const wallEntity = world.createEntity();
      wallEntity.addComponent(Wall, {
        segments: [
          [
            { x: 150, y: 50 },
            { x: 150, y: 150 }
          ]
        ],
        thickness: 5,
        color: 0x000000
      });

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      entity.addComponent(Knockback, {
        force: { x: 100, y: 0 }, // Push right toward wall
        duration: 200,
        elapsed: 0
      });

      const initialX = 100;
      
      // Run several frames
      for (let i = 0; i < 10; i++) {
        world.execute(16, 16);
      }

      const position = entity.getComponent(Position)!;
      // Should not have passed through the wall at x=150
      expect(position.x).toBeLessThan(150 - 5); // collision radius
    });

    it('should reduce knockback force on wall collision', () => {
      // Create a wall
      const wallEntity = world.createEntity();
      wallEntity.addComponent(Wall, {
        segments: [
          [
            { x: 120, y: 50 },
            { x: 120, y: 150 }
          ]
        ],
        thickness: 5,
        color: 0x000000
      });

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      entity.addComponent(Knockback, {
        force: { x: 100, y: 0 },
        duration: 200,
        elapsed: 0
      });

      const initialForce = 100;

      // Run one frame to hit the wall
      world.execute(16, 16);
      
      // Position should be adjusted, force should be reduced or knockback removed
      const knockback = entity.getComponent(Knockback);
      if (knockback) {
        // If still has knockback, force should be significantly reduced
        expect(Math.abs(knockback.force.x)).toBeLessThan(initialForce);
      }
      // Or knockback might be removed entirely on strong collision
    });

    it('should handle no walls present', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });

      // Should not throw even with no walls
      expect(() => {
        world.execute(16, 16);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle zero force', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 0, y: 0 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      const velocity = entity.getComponent(Velocity)!;
      expect(velocity.vx).toBe(0);
      expect(velocity.vy).toBe(0);
    });

    it('should handle very small force', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 0.001, y: 0.001 },
        duration: 200,
        elapsed: 0
      });

      expect(() => {
        world.execute(16, 16);
      }).not.toThrow();
    });

    it('should handle entity without velocity component', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 30 },
        duration: 200,
        elapsed: 0
      });

      // System should query for [Knockback, Position, Velocity]
      // so this entity should be ignored
      expect(() => {
        world.execute(16, 16);
      }).not.toThrow();
    });

    it('should handle negative force', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: -50, y: -30 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      const velocity = entity.getComponent(Velocity)!;
      expect(velocity.vx).toBeLessThan(0);
      expect(velocity.vy).toBeLessThan(0);
    });
  });

  describe('position updates', () => {
    it('should update entity position based on knockback velocity', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Knockback, {
        force: { x: 50, y: 0 },
        duration: 200,
        elapsed: 0
      });

      const initialX = 100;
      
      world.execute(16, 16);

      const position = entity.getComponent(Position)!;
      // Position should have moved in the direction of knockback
      expect(position.x).toBeGreaterThan(initialX);
    });

    it('should handle multiple entities with knockback simultaneously', () => {
      const entity1 = world.createEntity();
      entity1.addComponent(Position, { x: 100, y: 100 });
      entity1.addComponent(Velocity, { vx: 0, vy: 0 });
      entity1.addComponent(Knockback, {
        force: { x: 50, y: 0 },
        duration: 200,
        elapsed: 0
      });

      const entity2 = world.createEntity();
      entity2.addComponent(Position, { x: 200, y: 200 });
      entity2.addComponent(Velocity, { vx: 0, vy: 0 });
      entity2.addComponent(Knockback, {
        force: { x: -30, y: 40 },
        duration: 200,
        elapsed: 0
      });

      world.execute(16, 16);

      expect(entity1.hasComponent(Knockback)).toBe(true);
      expect(entity2.hasComponent(Knockback)).toBe(true);
      
      const pos1 = entity1.getComponent(Position)!;
      const pos2 = entity2.getComponent(Position)!;
      
      expect(pos1.x).toBeGreaterThan(100);
      expect(pos2.y).toBeGreaterThan(200);
    });
  });
});

