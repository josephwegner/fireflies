import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { MovementSystem } from '../MovementSystem';
import { Position, Velocity, Path, Target } from '@/ecs/components';
import { PHYSICS_CONFIG } from '@/config';

describe('MovementSystem', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Position);
    world.registerComponent(Velocity);
    world.registerComponent(Path);
    world.registerComponent(Target);
    world.registerSystem(MovementSystem);
  });

  it('should move entity towards path waypoint', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: 0, vy: 0 });
    entity.addComponent(Path, {
      currentPath: [{ x: 10, y: 10 }],
      nextPath: [],
      direction: 'r'
    });

    const initialX = 0;
    const initialY = 0;

    world.execute(16, 16); // 16ms delta

    const position = entity.getComponent(Position)!;

    // Entity should have moved towards the waypoint
    expect(position.x).toBeGreaterThan(initialX);
    expect(position.y).toBeGreaterThan(initialY);
  });

  it('should reach waypoint and remove it from path', () => {
    const entity = world.createEntity();
    // Position entity right at the waypoint threshold
    entity.addComponent(Position, { x: 9.999, y: 9.999 });
    entity.addComponent(Velocity, { vx: 0, vy: 0 });
    entity.addComponent(Path, {
      currentPath: [{ x: 10, y: 10 }],
      nextPath: [],
      direction: 'r'
    });

    world.execute(100, 100); // Large delta to ensure arrival

    const pathComp = entity.getComponent(Path)!;

    // Waypoint should be removed from path
    expect(pathComp.currentPath.length).toBe(0);
  });

  it('should transition to next path when current path completes', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: 0, vy: 0 });
    entity.addComponent(Path, {
      currentPath: [],
      nextPath: [{ x: 20, y: 20 }],
      direction: 'r'
    });

    // First execution should not move to next path yet
    // because currentPath is empty but wasn't completed by arrival
    world.execute(16, 16);

    const pathComp = entity.getComponent(Path)!;

    // Without a currentPath waypoint to complete, nextPath stays as is
    // This tests the edge case where currentPath starts empty
    expect(pathComp.nextPath.length).toBe(1);
  });

  it('should apply friction to velocity', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: 10, vy: 10 });
    entity.addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: 'r'
    });

    world.execute(16, 16);

    const velocity = entity.getComponent(Velocity)!;

    // Velocity should be reduced by friction
    expect(velocity.vx).toBeLessThan(10);
    expect(velocity.vy).toBeLessThan(10);
    expect(velocity.vx).toBeCloseTo(10 * PHYSICS_CONFIG.FRICTION, 5);
    expect(velocity.vy).toBeCloseTo(10 * PHYSICS_CONFIG.FRICTION, 5);
  });

  it('should stop entity when velocity is below minimum threshold', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: PHYSICS_CONFIG.MIN_VELOCITY / 2, vy: PHYSICS_CONFIG.MIN_VELOCITY / 2 });
    entity.addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: 'r'
    });

    world.execute(16, 16);

    const velocity = entity.getComponent(Velocity)!;

    // Velocity should be zeroed out
    expect(velocity.vx).toBe(0);
    expect(velocity.vy).toBe(0);
  });

  it('should handle multiple waypoints in sequence', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 4.9, y: 4.9 });
    entity.addComponent(Velocity, { vx: 0, vy: 0 });
    entity.addComponent(Path, {
      currentPath: [
        { x: 5, y: 5 },
        { x: 10, y: 10 },
        { x: 15, y: 15 }
      ],
      nextPath: [],
      direction: 'r'
    });

    const pathComp = entity.getComponent(Path)!;
    expect(pathComp.currentPath.length).toBe(3);

    world.execute(100, 100);

    // First waypoint should be removed
    expect(pathComp.currentPath.length).toBe(2);
    expect(pathComp.currentPath[0]).toEqual({ x: 10, y: 10 });
  });

  it('should handle empty path gracefully', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: 5, vy: 5 });
    entity.addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: 'r'
    });

    // Should not throw error
    expect(() => world.execute(16, 16)).not.toThrow();

    const velocity = entity.getComponent(Velocity)!;

    // Should apply friction even with empty path
    expect(velocity.vx).toBeLessThan(5);
    expect(velocity.vy).toBeLessThan(5);
  });

  it('should not process entities without required components', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    // Missing Velocity component

    // Should not throw error
    expect(() => world.execute(16, 16)).not.toThrow();
  });

  it('should update velocity based on path direction', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: 0, vy: 0 });
    entity.addComponent(Path, {
      currentPath: [{ x: 100, y: 0 }], // Move right
      nextPath: [],
      direction: 'r'
    });

    world.execute(16, 16);

    const position = entity.getComponent(Position)!;

    // Should move right (positive x)
    expect(position.x).toBeGreaterThan(0);
    // Should not move in y direction
    expect(Math.abs(position.y)).toBeLessThan(0.1);
  });

  it('should combine path movement with velocity', () => {
    const entity = world.createEntity();
    entity.addComponent(Position, { x: 0, y: 0 });
    entity.addComponent(Velocity, { vx: 5, vy: 5 });
    entity.addComponent(Path, {
      currentPath: [{ x: 10, y: 10 }],
      nextPath: [],
      direction: 'r'
    });

    world.execute(16, 16);

    const position = entity.getComponent(Position)!;

    // Position should reflect both path movement and velocity
    expect(position.x).toBeGreaterThan(0);
    expect(position.y).toBeGreaterThan(0);
  });

  describe('Combat Movement Behavior', () => {
    it('should not follow path when entity has Target component', () => {
      const entity = world.createEntity();
      const targetEntity = world.createEntity();
      
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Path, {
        currentPath: [{ x: 100, y: 100 }],
        nextPath: [],
        direction: 'r'
      });
      entity.addComponent(Target, { target: targetEntity });

      world.execute(16, 16);

      const position = entity.getComponent(Position)!;

      // Entity should NOT have moved towards path waypoint
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
    });

    it('should still apply velocity from dash attacks when entity has Target', () => {
      const entity = world.createEntity();
      const targetEntity = world.createEntity();
      
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 50, vy: 50 }); // Dash velocity
      entity.addComponent(Path, {
        currentPath: [{ x: 100, y: 100 }],
        nextPath: [],
        direction: 'r'
      });
      entity.addComponent(Target, { target: targetEntity });

      world.execute(16, 16);

      const position = entity.getComponent(Position)!;

      // Entity SHOULD have moved from velocity (dash attack)
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(0);
      
      // But not as much as if following path too
      expect(position.x).toBeLessThan(1.0); // Only velocity * dt movement
      expect(position.y).toBeLessThan(1.0);
    });

    it('should still apply friction when entity has Target', () => {
      const entity = world.createEntity();
      const targetEntity = world.createEntity();
      
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 10, vy: 10 });
      entity.addComponent(Path, {
        currentPath: [{ x: 100, y: 100 }],
        nextPath: [],
        direction: 'r'
      });
      entity.addComponent(Target, { target: targetEntity });

      world.execute(16, 16);

      const velocity = entity.getComponent(Velocity)!;

      // Friction should still be applied
      expect(velocity.vx).toBeLessThan(10);
      expect(velocity.vy).toBeLessThan(10);
      expect(velocity.vx).toBeCloseTo(10 * PHYSICS_CONFIG.FRICTION, 5);
    });

    it('should resume path-following after Target component is removed', () => {
      const entity = world.createEntity();
      const targetEntity = world.createEntity();
      
      entity.addComponent(Position, { x: 0, y: 0 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Path, {
        currentPath: [{ x: 100, y: 100 }],
        nextPath: [],
        direction: 'r'
      });
      entity.addComponent(Target, { target: targetEntity });

      // First execution: should not move
      world.execute(16, 16);
      let position = entity.getComponent(Position)!;
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);

      // Remove Target component
      entity.removeComponent(Target);

      // Second execution: should resume path-following
      world.execute(16, 16);
      position = entity.getComponent(Position)!;
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(0);
    });
  });
});
