import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { MovementSystem } from '../MovementSystem';
import { TargetingSystem } from '../TargetingSystem';
import { Position, Velocity, Path, Targeting, Target } from '@/ecs/components';

describe('Edge Cases and Negative Tests', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Position);
    world.registerComponent(Velocity);
    world.registerComponent(Path);
    world.registerComponent(Targeting);
    world.registerComponent(Target);
  });

  describe('MovementSystem Edge Cases', () => {
    beforeEach(() => {
      world.registerSystem(MovementSystem);
    });

    it('should handle NaN position values gracefully', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: NaN, y: NaN });
      entity.addComponent(Velocity, { vx: 1, vy: 1 });
      entity.addComponent(Path, {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle Infinity position values', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: Infinity, y: -Infinity });
      entity.addComponent(Velocity, { vx: 1, vy: 1 });
      entity.addComponent(Path, {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle very large position values', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 1e10, y: 1e10 });
      entity.addComponent(Velocity, { vx: 1, vy: 1 });
      entity.addComponent(Path, {
        currentPath: [{ x: 1e10 + 100, y: 1e10 + 100 }],
        nextPath: [],
        direction: 'r'
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle negative position values', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: -100, y: -100 });
      entity.addComponent(Velocity, { vx: 1, vy: 1 });
      entity.addComponent(Path, {
        currentPath: [{ x: -50, y: -50 }],
        nextPath: [],
        direction: 'r'
      });

      world.execute(16, 16);

      const position = entity.getComponent(Position)!;
      expect(position.x).toBeGreaterThan(-100);
      expect(position.y).toBeGreaterThan(-100);
    });

    it('should handle zero delta time', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 10, vy: 10 });
      entity.addComponent(Path, {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      });

      world.execute(0, 0);

      const position = entity.getComponent(Position)!;
      // Position should barely change with zero delta
      expect(Math.abs(position.x)).toBeLessThan(0.1);
      expect(Math.abs(position.y)).toBeLessThan(0.1);
    });

    it('should handle very large delta time', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 1, vy: 1 });
      entity.addComponent(Path, {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      });

      expect(() => world.execute(10000, 10000)).not.toThrow();
    });

    it('should handle path with duplicate waypoints', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Path, {
        currentPath: [
          { x: 10, y: 10 },
          { x: 10, y: 10 },
          { x: 10, y: 10 }
        ],
        nextPath: [],
        direction: 'r'
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle path with waypoint at current position', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 10, y: 10 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Path, {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      });

      world.execute(100, 100);

      const pathComp = entity.getComponent(Path)!;
      // Waypoint should be removed as entity is already there
      expect(pathComp.currentPath.length).toBe(0);
    });

    it('should handle very large velocity values', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 1000, vy: 1000 });
      entity.addComponent(Path, {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle zero velocity with path', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Path, {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      });

      world.execute(16, 16);

      const position = entity.getComponent(Position)!;
      // Entity should still move towards waypoint even with zero initial velocity
      expect(position.x).toBeGreaterThan(0);
    });
  });

  describe('TargetingSystem Edge Cases', () => {
    beforeEach(() => {
      world.registerSystem(TargetingSystem);
    });

    it('should handle empty potentialTargets array', () => {
      const entity = world.createEntity();
      entity.addComponent(Targeting, {
        potentialTargets: []
      });

      expect(() => world.execute(16, 16)).not.toThrow();
      expect(entity.hasComponent(Target)).toBe(false);
    });

    it('should handle null in potentialTargets array', () => {
      const entity = world.createEntity();
      entity.addComponent(Targeting, {
        potentialTargets: [null as any]
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle undefined in potentialTargets array', () => {
      const entity = world.createEntity();
      entity.addComponent(Targeting, {
        potentialTargets: [undefined as any]
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle self-targeting', () => {
      const entity = world.createEntity();
      entity.addComponent(Targeting, {
        potentialTargets: [entity]
      });

      world.execute(16, 16);

      // System allows self-targeting (business logic decision)
      expect(entity.hasComponent(Target)).toBe(true);
    });

    it('should handle removed entity in potentialTargets', () => {
      const entity = world.createEntity();
      const targetEntity = world.createEntity();

      entity.addComponent(Targeting, {
        potentialTargets: [targetEntity]
      });

      // Remove target entity before execution
      targetEntity.remove();

      // Should not throw when trying to target removed entity
      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle very large potentialTargets array', () => {
      const entity = world.createEntity();
      const targets = [];

      for (let i = 0; i < 1000; i++) {
        targets.push(world.createEntity());
      }

      entity.addComponent(Targeting, {
        potentialTargets: targets
      });

      expect(() => world.execute(16, 16)).not.toThrow();
      expect(entity.hasComponent(Target)).toBe(true);
    });
  });

  describe('Multiple System Interactions', () => {
    beforeEach(() => {
      world.registerSystem(MovementSystem);
      world.registerSystem(TargetingSystem);
    });

    it('should handle entity with all components', () => {
      const entity = world.createEntity();
      const targetEntity = world.createEntity();

      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 1, vy: 1 });
      entity.addComponent(Path, {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      });
      entity.addComponent(Targeting, {
        potentialTargets: [targetEntity]
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle no entities', () => {
      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle many entities', () => {
      for (let i = 0; i < 100; i++) {
        const entity = world.createEntity();
        entity.addComponent(Position, { x: i, y: i });
        entity.addComponent(Velocity, { vx: 1, vy: 1 });
        entity.addComponent(Path, {
          currentPath: [],
          nextPath: [],
          direction: 'r'
        });
      }

      expect(() => world.execute(16, 16)).not.toThrow();
    });
  });
});
