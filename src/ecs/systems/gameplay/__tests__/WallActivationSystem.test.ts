import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { WallActivationSystem } from '../WallActivationSystem';
import { gameEvents, GameEvents } from '@/events';
import { GAME_CONFIG } from '@/config';

function createMockWorker(): Worker {
  return {
    postMessage: vi.fn(),
    onmessage: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as Worker;
}

function createWallBlueprintEntity(
  world: GameWorld,
  siteA: { x: number; y: number },
  siteB: { x: number; y: number }
): Entity {
  return world.add({
    position: { x: (siteA.x + siteB.x) / 2, y: (siteA.y + siteB.y) / 2 },
    buildable: {
      sites: [
        { x: siteA.x, y: siteA.y, built: true, buildProgress: 1 },
        { x: siteB.x, y: siteB.y, built: true, buildProgress: 1 }
      ],
      buildTime: 5,
      allBuilt: true
    },
    wallBlueprint: { active: false },
    wallBlueprintTag: true as const
  });
}

describe('WallActivationSystem', () => {
  let world: GameWorld;
  let system: WallActivationSystem;
  let worker: Worker;

  beforeEach(() => {
    world = new World<Entity>();
    worker = createMockWorker();
    system = new WallActivationSystem(world, { worker });
  });

  afterEach(() => {
    system.destroy();
    gameEvents.clear();
  });

  describe('activation on BUILD_COMPLETE', () => {
    it('should set wallBlueprint.active to true when BUILD_COMPLETE fires for a wall', () => {
      const blueprint = createWallBlueprintEntity(world, { x: 0, y: 0 }, { x: 100, y: 0 });

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: blueprint });

      expect(blueprint.wallBlueprint!.active).toBe(true);
    });

    it('should emit WALL_ACTIVATED', () => {
      const blueprint = createWallBlueprintEntity(world, { x: 0, y: 0 }, { x: 100, y: 0 });

      const handler = vi.fn();
      gameEvents.on(GameEvents.WALL_ACTIVATED, handler);

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: blueprint });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ entity: blueprint }));
    });

    it('should send updateWalls to worker', () => {
      // Add existing wall entity
      world.add({
        wall: {
          segments: [[{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]],
          thickness: 2,
          color: 0x000000
        },
        wallTag: true as const
      });

      const blueprint = createWallBlueprintEntity(world, { x: 0, y: 50 }, { x: 100, y: 50 });

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: blueprint });

      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'updateWalls' })
      );
      // walls should include original segments plus new wall rect
      const call = (worker.postMessage as any).mock.calls[0][0];
      expect(call.walls.length).toBeGreaterThan(1); // original + blueprint rect
    });

    it('should ignore BUILD_COMPLETE for non-wall entities', () => {
      const nonWall = world.add({
        buildable: {
          sites: [{ x: 0, y: 0, built: true, buildProgress: 1 }],
          buildTime: 5,
          allBuilt: true
        }
      });

      const handler = vi.fn();
      gameEvents.on(GameEvents.WALL_ACTIVATED, handler);

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: nonWall });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('push-out on activation', () => {
    it('should push entities off the new wall segment', () => {
      world.add({
        wall: { segments: [], thickness: 2, color: 0x000000 },
        wallTag: true as const
      });

      // Wall from (0,100) to (100,100), horizontal
      const blueprint = createWallBlueprintEntity(world, { x: 0, y: 100 }, { x: 100, y: 100 });

      // Entity sitting right on the wall line
      const entity = world.add({
        position: { x: 50, y: 100 },
        path: { currentPath: [{ x: 200, y: 200 }], goalPath: [], direction: 'r' }
      });

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: blueprint });

      // Entity should have been pushed off the wall
      const halfThick = GAME_CONFIG.WALL_BLUEPRINT_THICKNESS / 2;
      const distFromWall = Math.abs(entity.position!.y - 100);
      expect(distFromWall).toBeGreaterThanOrEqual(halfThick);
    });

    it('should clear paths of pushed entities', () => {
      world.add({
        wall: { segments: [], thickness: 2, color: 0x000000 },
        wallTag: true as const
      });

      const blueprint = createWallBlueprintEntity(world, { x: 0, y: 100 }, { x: 100, y: 100 });
      const entity = world.add({
        position: { x: 50, y: 100 },
        path: { currentPath: [{ x: 200, y: 200 }], goalPath: [{ x: 300, y: 300 }], direction: 'r' }
      });

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: blueprint });

      expect(entity.path!.currentPath).toEqual([]);
      expect(entity.path!.goalPath).toEqual([]);
    });

    it('should not push entities far from the wall', () => {
      world.add({
        wall: { segments: [], thickness: 2, color: 0x000000 },
        wallTag: true as const
      });

      const blueprint = createWallBlueprintEntity(world, { x: 0, y: 100 }, { x: 100, y: 100 });
      const entity = world.add({
        position: { x: 50, y: 200 }
      });

      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity: blueprint });

      expect(entity.position!.x).toBe(50);
      expect(entity.position!.y).toBe(200);
    });
  });
});
