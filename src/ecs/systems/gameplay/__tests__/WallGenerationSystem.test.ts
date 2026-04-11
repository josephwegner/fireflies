import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { WallGenerationSystem } from '../WallGenerationSystem';
import { GAME_CONFIG } from '@/config';
import { createMockWorker } from '@/__tests__/helpers';

describe('WallGenerationSystem', () => {
  let world: GameWorld;
  let mockWorker: any;

  beforeEach(() => {
    world = new World<Entity>();
    mockWorker = createMockWorker();
  });

  it('should create wall entity on first execution', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    const wallEntities = world.with('wallTag');
    expect(wallEntities.entities.length).toBe(1);
  });

  it('should add Wall component with segments', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    const wallEntities = world.with('wall', 'wallTag');
    expect(wallEntities.entities.length).toBe(1);

    const wall = wallEntities.entities[0].wall!;
    expect(wall.segments).toBeDefined();
    expect(Array.isArray(wall.segments)).toBe(true);
    expect(wall.segments.length).toBeGreaterThan(0);
  });

  it('should set wall properties from config', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    const wallEntities = world.with('wall', 'wallTag');
    const wall = wallEntities.entities[0].wall!;

    expect(wall.thickness).toBe(GAME_CONFIG.WALL_THICKNESS);
    expect(wall.color).toBe(GAME_CONFIG.WALL_COLOR);
  });

  it('should send buildNavMesh message to worker', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'buildNavMesh',
        walls: expect.any(Array)
      })
    );
  });

  it('should only create wall entity once', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });

    system.update(16, 16);
    system.update(16, 16);
    system.update(16, 16);

    const wallEntities = world.with('wallTag');
    expect(wallEntities.entities.length).toBe(1);
  });

  it('should handle simple rectangular map', () => {
    const map = [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    const wallEntities = world.with('wall', 'wallTag');
    expect(wallEntities.entities.length).toBe(1);

    const wall = wallEntities.entities[0].wall!;
    expect(wall.segments.length).toBeGreaterThan(0);
  });

  it('should handle map with multiple rooms', () => {
    const map = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    const wallEntities = world.with('wall', 'wallTag');
    expect(wallEntities.entities.length).toBe(1);

    const wall = wallEntities.entities[0].wall!;
    expect(wall.segments.length).toBeGreaterThan(0);
  });

  it('should not create wall entity without map', () => {
    const system = new WallGenerationSystem(world, { worker: mockWorker });
    system.update(16, 16);

    const wallEntities = world.with('wallTag');
    expect(wallEntities.entities.length).toBe(0);
  });

  it('should generate smooth wall segments', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    const system = new WallGenerationSystem(world, { worker: mockWorker, map });
    system.update(16, 16);

    const wallEntities = world.with('wall', 'wallTag');
    const wall = wallEntities.entities[0].wall!;

    wall.segments.forEach((segment: any[]) => {
      expect(segment.length).toBeGreaterThan(3);
      segment.forEach((point: any) => {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
