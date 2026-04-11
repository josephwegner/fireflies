import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { MovementSystem } from '../MovementSystem';
import { PHYSICS_CONFIG } from '@/config';

describe('MovementSystem', () => {
  let world: GameWorld;
  let system: MovementSystem;

  beforeEach(() => {
    world = new World<Entity>();
    system = new MovementSystem(world, {});
  });

  it('should move entity towards path waypoint', () => {
    const entity = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      path: {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      }
    });

    system.update(16, 16);

    expect(entity.position!.x).toBeGreaterThan(0);
    expect(entity.position!.y).toBeGreaterThan(0);
  });

  it('should reach waypoint and remove it from path', () => {
    const entity = world.add({
      position: { x: 9.999, y: 9.999 },
      velocity: { vx: 0, vy: 0 },
      path: {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      }
    });

    system.update(100, 100);

    expect(entity.path!.currentPath.length).toBe(0);
  });

  it('should transition to next path when current path completes', () => {
    const entity = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      path: {
        currentPath: [],
        nextPath: [{ x: 20, y: 20 }],
        direction: 'r'
      }
    });

    system.update(16, 16);

    expect(entity.path!.nextPath.length).toBe(1);
  });

  it('should apply friction to velocity', () => {
    world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 10, vy: 10 },
      path: {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      }
    });

    system.update(16, 16);

    const entity = world.with('velocity').first!;
    expect(entity.velocity.vx).toBeLessThan(10);
    expect(entity.velocity.vy).toBeLessThan(10);
    expect(entity.velocity.vx).toBeCloseTo(10 * PHYSICS_CONFIG.FRICTION, 5);
    expect(entity.velocity.vy).toBeCloseTo(10 * PHYSICS_CONFIG.FRICTION, 5);
  });

  it('should stop entity when velocity is below minimum threshold', () => {
    const entity = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: PHYSICS_CONFIG.MIN_VELOCITY / 2, vy: PHYSICS_CONFIG.MIN_VELOCITY / 2 },
      path: {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      }
    });

    system.update(16, 16);

    expect(entity.velocity!.vx).toBe(0);
    expect(entity.velocity!.vy).toBe(0);
  });

  it('should handle multiple waypoints in sequence', () => {
    const entity = world.add({
      position: { x: 4.9, y: 4.9 },
      velocity: { vx: 0, vy: 0 },
      path: {
        currentPath: [
          { x: 5, y: 5 },
          { x: 10, y: 10 },
          { x: 15, y: 15 }
        ],
        nextPath: [],
        direction: 'r'
      }
    });

    expect(entity.path!.currentPath.length).toBe(3);

    system.update(100, 100);

    expect(entity.path!.currentPath.length).toBe(2);
    expect(entity.path!.currentPath[0]).toEqual({ x: 10, y: 10 });
  });

  it('should handle empty path gracefully', () => {
    const entity = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 5, vy: 5 },
      path: {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      }
    });

    expect(() => system.update(16, 16)).not.toThrow();

    expect(entity.velocity!.vx).toBeLessThan(5);
    expect(entity.velocity!.vy).toBeLessThan(5);
  });

  it('should not process entities without required components', () => {
    world.add({
      position: { x: 0, y: 0 }
    });

    expect(() => system.update(16, 16)).not.toThrow();
  });

  it('should update velocity based on path direction', () => {
    const entity = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      path: {
        currentPath: [{ x: 100, y: 0 }],
        nextPath: [],
        direction: 'r'
      }
    });

    system.update(16, 16);

    expect(entity.position!.x).toBeGreaterThan(0);
    expect(Math.abs(entity.position!.y)).toBeLessThan(0.1);
  });

  it('should combine path movement with velocity', () => {
    const entity = world.add({
      position: { x: 0, y: 0 },
      velocity: { vx: 5, vy: 5 },
      path: {
        currentPath: [{ x: 10, y: 10 }],
        nextPath: [],
        direction: 'r'
      }
    });

    system.update(16, 16);

    expect(entity.position!.x).toBeGreaterThan(0);
    expect(entity.position!.y).toBeGreaterThan(0);
  });

  describe('Combat Movement Behavior', () => {
    it('should not follow path when entity has target component', () => {
      const targetEntity = world.add({});

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        path: {
          currentPath: [{ x: 100, y: 100 }],
          nextPath: [],
          direction: 'r'
        },
        target: { target: targetEntity }
      });

      system.update(16, 16);

      expect(entity.position!.x).toBe(0);
      expect(entity.position!.y).toBe(0);
    });

    it('should still apply velocity from dash attacks when entity has Target', () => {
      const targetEntity = world.add({});

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 50, vy: 50 },
        path: {
          currentPath: [{ x: 100, y: 100 }],
          nextPath: [],
          direction: 'r'
        },
        target: { target: targetEntity }
      });

      system.update(16, 16);

      expect(entity.position!.x).toBeGreaterThan(0);
      expect(entity.position!.y).toBeGreaterThan(0);

      expect(entity.position!.x).toBeLessThan(1.0);
      expect(entity.position!.y).toBeLessThan(1.0);
    });

    it('should still apply friction when entity has Target', () => {
      const targetEntity = world.add({});

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 10, vy: 10 },
        path: {
          currentPath: [{ x: 100, y: 100 }],
          nextPath: [],
          direction: 'r'
        },
        target: { target: targetEntity }
      });

      system.update(16, 16);

      expect(entity.velocity!.vx).toBeLessThan(10);
      expect(entity.velocity!.vy).toBeLessThan(10);
      expect(entity.velocity!.vx).toBeCloseTo(10 * PHYSICS_CONFIG.FRICTION, 5);
    });

    it('should resume path-following after target component is removed', () => {
      const targetEntity = world.add({});

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        path: {
          currentPath: [{ x: 100, y: 100 }],
          nextPath: [],
          direction: 'r'
        },
        target: { target: targetEntity }
      });

      system.update(16, 16);
      expect(entity.position!.x).toBe(0);
      expect(entity.position!.y).toBe(0);

      world.removeComponent(entity, 'target');

      system.update(16, 16);
      expect(entity.position!.x).toBeGreaterThan(0);
      expect(entity.position!.y).toBeGreaterThan(0);
    });
  });
});
