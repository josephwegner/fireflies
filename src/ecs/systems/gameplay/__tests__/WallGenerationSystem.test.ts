import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { WallGenerationSystem } from '../WallGenerationSystem';
import { Wall, WallTag } from '@/ecs/components';
import { GAME_CONFIG } from '@/config';

describe('WallGenerationSystem', () => {
  let world: World;
  let mockWorker: any;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Wall);
    world.registerComponent(WallTag);

    mockWorker = {
      postMessage: vi.fn()
    };
  });

  it('should create wall entity on first execution', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    expect(system.wallEntity).toBeDefined();
    expect(system.wallEntity.hasComponent(WallTag)).toBe(true);
  });

  it('should add Wall component with segments', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    expect(system.wallEntity.hasComponent(Wall)).toBe(true);

    const wall = system.wallEntity.getComponent(Wall)!;
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

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    const wall = system.wallEntity.getComponent(Wall)!;

    expect(wall.thickness).toBe(GAME_CONFIG.WALL_THICKNESS);
    expect(wall.color).toBe(GAME_CONFIG.WALL_COLOR);
  });

  it('should send buildNavMesh message to worker', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

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

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    const system = world.getSystem(WallGenerationSystem) as any;

    world.execute(16, 16);
    const firstEntity = system.wallEntity;

    world.execute(16, 16);
    world.execute(16, 16);

    // Should be the same entity
    expect(system.wallEntity).toBe(firstEntity);
  });

  it('should handle simple rectangular map', () => {
    const map = [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1]
    ];

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    expect(system.wallEntity).toBeDefined();

    const wall = system.wallEntity.getComponent(Wall)!;
    expect(wall.segments.length).toBeGreaterThan(0);
  });

  it('should handle map with multiple rooms', () => {
    const map = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    expect(system.wallEntity).toBeDefined();

    const wall = system.wallEntity.getComponent(Wall)!;
    expect(wall.segments.length).toBeGreaterThan(0);
  });

  it('should not create wall entity without map', () => {
    world.registerSystem(WallGenerationSystem, { worker: mockWorker });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    expect(system.wallEntity).toBeNull();
  });

  it('should generate smooth wall segments', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];

    world.registerSystem(WallGenerationSystem, { worker: mockWorker, map });
    world.execute(16, 16);

    const system = world.getSystem(WallGenerationSystem) as any;
    const wall = system.wallEntity.getComponent(Wall)!;

    // Smoothed segments should have more points than the original marching squares contour
    wall.segments.forEach(segment => {
      expect(segment.length).toBeGreaterThan(3);
      segment.forEach(point => {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
