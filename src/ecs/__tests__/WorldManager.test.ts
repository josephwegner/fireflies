import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity } from '@/ecs/Entity';
import { EnergyManager } from '@/ui/EnergyManager';
import { createMockScene, createMockWorker } from '@/__tests__/helpers';

function createMockSystem() {
  return { update: vi.fn(), destroy: vi.fn() };
}

const allMocks: ReturnType<typeof createMockSystem>[] = [];

function trackedMockSystem() {
  const mock = createMockSystem();
  allMocks.push(mock);
  return mock;
}

const mockPathfindingService = { destroy: vi.fn() };

vi.mock('@/ecs/systems/rendering/RenderingSystem', () => ({
  RenderingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/WallRenderingSystem', () => ({
  WallRenderingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/ForestDecorationSystem', () => ({
  ForestDecorationSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/TrailSystem', () => ({
  TrailSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/WispVisualsSystem', () => ({
  WispVisualsSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/CombatVisualsSystem', () => ({
  CombatVisualsSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/DebugRedirectSystem', () => ({
  DebugRedirectSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/rendering/WallBlueprintRenderingSystem', () => ({
  WallBlueprintRenderingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/effects/ParticleEffectsSystem', () => ({
  ParticleEffectsSystem: vi.fn(() => trackedMockSystem())
}));

vi.mock('@/ecs/systems/ui/UISystem', () => ({
  UISystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/ui/PlacementSystem', () => ({
  PlacementSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/ui/WallPlacementSystem', () => ({
  WallPlacementSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/ui/OverlaySystem', () => ({
  OverlaySystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/audio/SoundSystem', () => ({
  SoundSystem: vi.fn(() => trackedMockSystem())
}));

vi.mock('@/ecs/systems/gameplay/MovementSystem', () => ({
  MovementSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/InteractionSystem', () => ({
  InteractionSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/TargetingSystem', () => ({
  TargetingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/CombatSystem', () => ({
  CombatSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/DamageSystem', () => ({
  DamageSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/LodgingSystem', () => ({
  LodgingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/DestinationSystem', () => ({
  DestinationSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/RecruitmentSystem', () => ({
  RecruitmentSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/PathfindingService', () => ({
  PathfindingService: vi.fn(() => mockPathfindingService)
}));
vi.mock('@/ecs/systems/gameplay/WallGenerationSystem', () => ({
  WallGenerationSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/FireflyGoalSystem', () => ({
  FireflyGoalSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/VictorySystem', () => ({
  VictorySystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/SpawnerSystem', () => ({
  SpawnerSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/RedirectSystem', () => ({
  RedirectSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/DefeatSystem', () => ({
  DefeatSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/BuildingSystem', () => ({
  BuildingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/WallBreakingSystem', () => ({
  WallBreakingSystem: vi.fn(() => trackedMockSystem())
}));
vi.mock('@/ecs/systems/gameplay/WallActivationSystem', () => ({
  WallActivationSystem: vi.fn(() => trackedMockSystem())
}));

import { WorldManager } from '@/ecs/WorldManager';
import { DebugRedirectSystem } from '@/ecs/systems/rendering/DebugRedirectSystem';
import { PHYSICS_CONFIG } from '@/config';

function createManager(overrides: Record<string, unknown> = {}) {
  const scene = createMockScene() as any;
  const worker = createMockWorker() as any;
  const map = [[0, 0], [0, 0]];
  const config = {
    energyManager: new EnergyManager(100),
    levelConfig: { initialEnergy: 100, firefliesToWin: 5, store: {} },
    levelIndex: 0,
    onNextLevel: vi.fn(),
    onRetry: vi.fn(),
    debug: false,
    ...overrides
  };

  return new WorldManager(scene, worker, map, config);
}

describe('WorldManager', () => {
  beforeEach(() => {
    allMocks.length = 0;
    mockPathfindingService.destroy.mockClear();
    vi.mocked(DebugRedirectSystem).mockClear();
  });

  describe('initialization', () => {
    it('should create a Miniplex world', () => {
      const manager = createManager();
      expect(manager.world).toBeInstanceOf(World);
      manager.destroy();
    });

    it('should create a SpatialGrid with configured cell size', () => {
      const manager = createManager();
      expect(manager.spatialGrid).toBeDefined();

      manager.spatialGrid.insert({ position: { x: 0, y: 0 } } as Entity, 0, 0);
      const nearby = manager.spatialGrid.getNearby(0, 0, PHYSICS_CONFIG.SPATIAL_GRID_CELL_SIZE + 1);
      expect(nearby).toHaveLength(1);
      manager.destroy();
    });

    it('should register all systems', () => {
      const manager = createManager();
      expect(allMocks.length).toBeGreaterThan(25);
      manager.destroy();
    });

    it('should include DebugRedirectSystem when debug is true', () => {
      const manager = createManager({ debug: true });
      expect(DebugRedirectSystem).toHaveBeenCalled();
      manager.destroy();
    });

    it('should exclude DebugRedirectSystem when debug is false', () => {
      vi.mocked(DebugRedirectSystem).mockClear();
      const manager = createManager({ debug: false });
      expect(DebugRedirectSystem).not.toHaveBeenCalled();
      manager.destroy();
    });
  });

  describe('pause state', () => {
    it('should start paused', () => {
      const manager = createManager();
      expect(manager.paused).toBe(true);
      manager.destroy();
    });

    it('should allow unpausing', () => {
      const manager = createManager();
      manager.setPaused(false);
      expect(manager.paused).toBe(false);
      manager.destroy();
    });

    it('should allow re-pausing', () => {
      const manager = createManager();
      manager.setPaused(false);
      manager.setPaused(true);
      expect(manager.paused).toBe(true);
      manager.destroy();
    });
  });

  describe('update', () => {
    it('should call update on all systems when unpaused', () => {
      const manager = createManager();
      manager.setPaused(false);
      manager.update(16, 100);

      for (const mock of allMocks) {
        expect(mock.update).toHaveBeenCalledWith(16, 100);
      }
      manager.destroy();
    });

    it('should skip gameplay systems when paused', () => {
      const manager = createManager();
      manager.update(16, 100);

      const calledMocks = allMocks.filter(m => m.update.mock.calls.length > 0);
      const skippedMocks = allMocks.filter(m => m.update.mock.calls.length === 0);

      expect(calledMocks.length).toBeGreaterThan(0);
      expect(skippedMocks.length).toBeGreaterThan(0);
      manager.destroy();
    });

    it('should still update rendering and UI systems when paused', () => {
      const manager = createManager();
      manager.update(16, 100);

      const calledCount = allMocks.filter(m => m.update.mock.calls.length > 0).length;
      expect(calledCount).toBeGreaterThanOrEqual(14);
      manager.destroy();
    });

    it('should catch errors without crashing', () => {
      const manager = createManager();
      manager.setPaused(false);
      allMocks[0].update.mockImplementation(() => { throw new Error('boom'); });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => manager.update(16, 100)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      manager.destroy();
    });
  });

  describe('spatial grid rebuild', () => {
    it('should insert entities with position components into the grid', () => {
      const manager = createManager();
      manager.world.add({ position: { x: 50, y: 75 } } as Entity);
      manager.setPaused(false);

      manager.update(16, 100);

      const nearby = manager.spatialGrid.getNearby(50, 75, 10);
      expect(nearby).toHaveLength(1);
      manager.destroy();
    });

    it('should not include entities without position components', () => {
      const manager = createManager();
      manager.world.add({ velocity: { vx: 1, vy: 1 } } as Entity);
      manager.update(16, 100);

      const nearby = manager.spatialGrid.getNearby(0, 0, 10000);
      expect(nearby).toHaveLength(0);
      manager.destroy();
    });

    it('should clear and rebuild grid each update', () => {
      const manager = createManager();
      const entity = manager.world.add({ position: { x: 50, y: 50 } } as Entity);
      manager.update(16, 100);

      entity.position!.x = 500;
      entity.position!.y = 500;
      manager.update(16, 200);

      const atOld = manager.spatialGrid.getNearby(50, 50, 10);
      const atNew = manager.spatialGrid.getNearby(500, 500, 10);
      expect(atOld).toHaveLength(0);
      expect(atNew).toHaveLength(1);
      manager.destroy();
    });
  });

  describe('destroy', () => {
    it('should call destroy on all systems', () => {
      const manager = createManager();
      const systemCount = allMocks.length;
      manager.destroy();

      const destroyedCount = allMocks.filter(m => m.destroy.mock.calls.length > 0).length;
      expect(destroyedCount).toBe(systemCount);
    });

    it('should destroy pathfinding service', () => {
      const manager = createManager();
      manager.destroy();
      expect(mockPathfindingService.destroy).toHaveBeenCalled();
    });

    it('should clear the world', () => {
      const manager = createManager();
      manager.world.add({ position: { x: 0, y: 0 } } as Entity);
      expect(manager.world.entities.length).toBe(1);

      manager.destroy();
      expect(manager.world.entities.length).toBe(0);
    });

    it('should not update any systems after destroy', () => {
      const manager = createManager();
      manager.setPaused(false);
      manager.destroy();

      for (const mock of allMocks) {
        mock.update.mockClear();
      }

      manager.update(16, 100);
      for (const mock of allMocks) {
        expect(mock.update).not.toHaveBeenCalled();
      }
    });
  });
});
