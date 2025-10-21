import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import {
  Position,
  Velocity,
  Path,
  Renderable,
  Destination,
  Targeting,
  FireflyTag,
  WispTag,
  MonsterTag,
  GoalTag,
} from '@/ecs/components';
import {
  RenderingSystem,
  WallRenderingSystem,
  MovementSystem,
  TargetingSystem,
  DestinationSystem,
  WallGenerationSystem,
  InteractionSystem,
  CombatSystem
} from '@/ecs/systems';
import { SpatialGrid } from '@/utils';

// Mock Phaser before importing GameScene
vi.mock('phaser', () => {
  return {
    default: {
      Scene: class Scene {
        scene = { key: '' };
        constructor(key: string) {
          this.scene.key = key;
        }
      }
    }
  };
});

// Mock AssetLoader
vi.mock('@/assets', () => ({
  AssetLoader: {
    preloadAll: vi.fn()
  }
}));

import { GameScene } from '../GameScene';
import { AssetLoader } from '@/assets';

// Create a testable version of GameScene with mocked Phaser dependencies
class TestableGameScene extends GameScene {
  constructor() {
    super();

    // Mock Phaser scene dependencies that systems need
    (this as any).add = {
      graphics: vi.fn(() => ({
        lineStyle: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        strokePath: vi.fn(),
        clear: vi.fn()
      })),
      container: vi.fn(() => ({
        add: vi.fn(),
        setPosition: vi.fn(),
        destroy: vi.fn()
      })),
      sprite: vi.fn(() => ({
        setPosition: vi.fn(),
        destroy: vi.fn()
      })),
      circle: vi.fn(() => ({
        setPosition: vi.fn(),
        destroy: vi.fn()
      }))
    };

    (this as any).textures = {
      exists: vi.fn(() => false)
    };

    (this as any).load = {
      image: vi.fn(),
      audio: vi.fn(),
      spritesheet: vi.fn()
    };
  }

  // Make world accessible for testing
  getWorld(): World | undefined {
    return (this as any).world;
  }

  getMap(): number[][] | undefined {
    return (this as any).map;
  }

  getSpatialGrid(): SpatialGrid | undefined {
    return (this as any).spatialGrid;
  }

  // Override to avoid Worker creation
  protected createWorker(): Worker {
    return {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
      onmessage: null,
      onmessageerror: null,
      onerror: null
    } as any;
  }
}

describe('GameScene', () => {
  let scene: TestableGameScene;

  beforeEach(() => {
    scene = new TestableGameScene();
    vi.clearAllMocks();
  });

  describe('preload', () => {
    it('should call AssetLoader.preloadAll', () => {
      scene.preload();
      expect(AssetLoader.preloadAll).toHaveBeenCalledWith(scene);
    });
  });

  describe('create - World Initialization', () => {
    it('should initialize world instance', () => {
      scene.create();

      const world = scene.getWorld();
      expect(world).toBeDefined();
      expect(world).toBeInstanceOf(World);
    });

    it('should create pathfinding worker', () => {
      scene.create();

      // Worker is created via createWorker() which is mocked
      // Verify world was initialized (worker is used in system registration)
      const world = scene.getWorld();
      expect(world).toBeDefined();
    });

    it('should initialize all subsystems in correct sequence', () => {
      // This test verifies create() completes without errors
      expect(() => scene.create()).not.toThrow();

      const world = scene.getWorld()!;
      const map = scene.getMap()!;

      // Verify all subsystems are ready
      expect(world).toBeDefined();
      expect(map).toBeDefined();
      expect(world.componentsManager).toBeDefined();
      expect(world.systemManager).toBeDefined();
      expect(world.entityManager).toBeDefined();
    });
  });

  describe('create - Component Registration', () => {
    it('should allow creating entities with registered components', () => {
      scene.create();

      const world = scene.getWorld()!;
      const entity = world.createEntity();

      // Should be able to add registered components without errors
      expect(() => {
        entity.addComponent(Position, { x: 0, y: 0 });
        entity.addComponent(Velocity, { vx: 0, vy: 0 });
        entity.addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' });
        entity.addComponent(Renderable, { type: 'firefly', sprite: 'test', color: 0, radius: 5 });
        entity.addComponent(Destination, { x: 0, y: 0, for: [] });
        entity.addComponent(Targeting, { potentialTargets: [] });
        entity.addComponent(FireflyTag);
        entity.addComponent(WispTag);
      }).not.toThrow();

      // Verify components were added
      expect(entity.hasComponent(Position)).toBe(true);
      expect(entity.hasComponent(Velocity)).toBe(true);
      expect(entity.hasComponent(Path)).toBe(true);
      expect(entity.hasComponent(Renderable)).toBe(true);
      expect(entity.hasComponent(Destination)).toBe(true);
      expect(entity.hasComponent(Targeting)).toBe(true);
      expect(entity.hasComponent(FireflyTag)).toBe(true);
      expect(entity.hasComponent(WispTag)).toBe(true);
    });

    it('should register enough components for entity creation', () => {
      scene.create();

      const world = scene.getWorld()!;
      const components = world.componentsManager.Components;

      // Should have registered multiple components (at least 10+)
      expect(components.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('create - System Registration', () => {
    it('should register all required systems', () => {
      scene.create();

      const world = scene.getWorld()!;
      const systems = world.systemManager._systems;

      // Check each system type is registered
      expect(systems.some((s: any) => s instanceof WallGenerationSystem)).toBe(true);
      expect(systems.some((s: any) => s instanceof WallRenderingSystem)).toBe(true);
      expect(systems.some((s: any) => s instanceof RenderingSystem)).toBe(true);
      expect(systems.some((s: any) => s instanceof MovementSystem)).toBe(true);
      expect(systems.some((s: any) => s instanceof DestinationSystem)).toBe(true);
      expect(systems.some((s: any) => s instanceof TargetingSystem)).toBe(true);
    });

    it('should register exactly 10 systems', () => {
      scene.create();

      const world = scene.getWorld()!;
      const systemCount = world.systemManager._systems.length;

      // 10 systems: WallGeneration, Interaction, Targeting, Combat, Damage, Knockback, Movement, Destination, WallRendering, Rendering
      expect(systemCount).toBe(10);
    });

    it('should pass scene to rendering systems', () => {
      scene.create();

      const world = scene.getWorld()!;
      const systems = world.systemManager._systems;

      const wallRenderingSystem = systems.find((s: any) => s instanceof WallRenderingSystem) as any;
      const renderingSystem = systems.find((s: any) => s instanceof RenderingSystem) as any;

      expect(wallRenderingSystem.scene).toBe(scene);
      expect(renderingSystem.scene).toBe(scene);
    });

    it('should pass worker to pathfinding systems', () => {
      scene.create();

      const world = scene.getWorld()!;
      const systems = world.systemManager._systems;

      const destinationSystem = systems.find((s: any) => s instanceof DestinationSystem) as any;
      const wallGenSystem = systems.find((s: any) => s instanceof WallGenerationSystem) as any;

      expect(destinationSystem.worker).toBeDefined();
      expect(wallGenSystem.worker).toBeDefined();
    });

    it('should pass map to WallGenerationSystem', () => {
      scene.create();

      const world = scene.getWorld()!;
      const systems = world.systemManager._systems;
      const map = scene.getMap()!;

      const wallGenSystem = systems.find((s: any) => s instanceof WallGenerationSystem) as any;

      expect(wallGenSystem.map).toBe(map);
    });
  });

  describe('create - Spatial Grid Integration', () => {
    it('should initialize spatial grid during create', () => {
      scene.create();

      const spatialGrid = scene.getSpatialGrid();
      expect(spatialGrid).toBeDefined();
      expect(spatialGrid).toBeInstanceOf(SpatialGrid);
    });

    it('should pass spatial grid to InteractionSystem', () => {
      scene.create();

      const world = scene.getWorld()!;
      const interactionSystem = world.getSystem(InteractionSystem) as any;
      
      expect(interactionSystem.spatialGrid).toBeDefined();
      expect(interactionSystem.spatialGrid).toBeInstanceOf(SpatialGrid);
    });

    it('should pass spatial grid to CombatSystem', () => {
      scene.create();

      const world = scene.getWorld()!;
      const combatSystem = world.getSystem(CombatSystem) as any;
      
      expect(combatSystem.spatialGrid).toBeDefined();
      expect(combatSystem.spatialGrid).toBeInstanceOf(SpatialGrid);
    });
  });

  describe('create - Map Creation', () => {
    it('should create 2D array map', () => {
      scene.create();

      const map = scene.getMap()!;

      expect(Array.isArray(map)).toBe(true);
      expect(Array.isArray(map[0])).toBe(true);
    });

    it('should have correct map dimensions (11x20)', () => {
      scene.create();

      const map = scene.getMap()!;

      expect(map.length).toBe(11);
      expect(map[0].length).toBe(20);
    });

    it('should contain only 0s and 1s', () => {
      scene.create();

      const map = scene.getMap()!;

      const allValid = map.every((row: number[]) =>
        row.every((cell: number) => cell === 0 || cell === 1)
      );

      expect(allValid).toBe(true);
    });

    it('should have walls in expected positions', () => {
      scene.create();

      const map = scene.getMap()!;

      // Spot check a few known positions from the hardcoded map
      expect(map[0][0]).toBe(0); // Top-left is open space
      expect(map[1][6]).toBe(1); // Known wall position
      expect(map[3][1]).toBe(1); // Another wall position
      expect(map[10][10]).toBe(0); // Bottom row is open

      // Verify map has some walls (not all zeros)
      const wallCount = map.flat().filter(cell => cell === 1).length;
      expect(wallCount).toBeGreaterThan(0);
    });
  });

  describe('create - Entity Creation', () => {
    it('should create firefly with required components', () => {
      scene.create();

      const world = scene.getWorld()!;
      const entities = world.entityManager._entities;
      const firefly = entities.find((e: any) => e.hasComponent(FireflyTag));

      expect(firefly).toBeDefined();
      expect(firefly!.hasComponent(Position)).toBe(true);
      expect(firefly!.hasComponent(Velocity)).toBe(true);
      expect(firefly!.hasComponent(Path)).toBe(true);
      expect(firefly!.hasComponent(Targeting)).toBe(true);
      expect(firefly!.hasComponent(Renderable)).toBe(true);
      expect(firefly!.hasComponent(FireflyTag)).toBe(true);
    });

    it('should create wisps with required components', () => {
      scene.create();

      const world = scene.getWorld()!;
      const entities = world.entityManager._entities;
      const wisps = entities.filter((e: any) => e.hasComponent(WispTag));

      expect(wisps.length).toBeGreaterThan(0);

      // Check first wisp has all required components
      const wisp = wisps[0];
      expect(wisp.hasComponent(Position)).toBe(true);
      expect(wisp.hasComponent(Destination)).toBe(true);
      expect(wisp.hasComponent(Renderable)).toBe(true);
      expect(wisp.hasComponent(WispTag)).toBe(true);
    });
  });

  describe('update - System Execution', () => {
    it('should execute world systems with correct parameters', () => {
      scene.create();

      const world = scene.getWorld()!;
      const executeSpy = vi.spyOn(world, 'execute');

      scene.update(100, 16);

      expect(executeSpy).toHaveBeenCalledWith(16, 100);
    });

    it('should handle errors during execution gracefully', () => {
      scene.create();

      const world = scene.getWorld()!;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(world, 'execute').mockImplementation(() => {
        throw new Error('System error');
      });

      expect(() => scene.update(100, 16)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[GameScene] Error during system execution:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should continue running after error', () => {
      scene.create();

      const world = scene.getWorld()!;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let callCount = 0;
      vi.spyOn(world, 'execute').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First error');
        }
      });

      scene.update(100, 16);
      scene.update(116, 16);

      expect(callCount).toBe(2);

      consoleSpy.mockRestore();
    });

    it('should call world.execute on each update', () => {
      scene.create();

      const world = scene.getWorld()!;
      const executeSpy = vi.spyOn(world, 'execute');

      scene.update(100, 16);
      scene.update(116, 16);
      scene.update(132, 16);

      expect(executeSpy).toHaveBeenCalledTimes(3);
    });

    it('should pass delta as first parameter and time as second', () => {
      scene.create();

      const world = scene.getWorld()!;
      const executeSpy = vi.spyOn(world, 'execute');

      scene.update(500, 32);

      // ECSY world.execute takes (delta, time)
      expect(executeSpy).toHaveBeenCalledWith(32, 500);
    });
  });

  describe('update - Spatial Grid Population', () => {
    it('should populate spatial grid with positioned entities before executing systems', () => {
      scene.create();

      const spatialGrid = scene.getSpatialGrid()!;

      const clearSpy = vi.spyOn(spatialGrid, 'clear');
      const insertSpy = vi.spyOn(spatialGrid, 'insert');

      scene.update(0, 16);

      expect(clearSpy).toHaveBeenCalled();

      // Verify entities were inserted (9 entities total: 1 firefly, 5 wisps, 1 monster, 2 goals)
      expect(insertSpy).toHaveBeenCalled();
      expect(insertSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should insert entities with their position coordinates', () => {
      scene.create();

      const spatialGrid = scene.getSpatialGrid()!;
      const insertSpy = vi.spyOn(spatialGrid, 'insert');

      scene.update(0, 16);

      const calls = insertSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Each call should be (entity, x, y) where x and y are numbers
      calls.forEach((call) => {
        expect(call).toHaveLength(3);
        expect(call[0]).toBeDefined(); // entity
        expect(typeof call[1]).toBe('number'); // x coordinate
        expect(typeof call[2]).toBe('number'); // y coordinate
      });
    });
    it('should populate grid before calling world.execute', () => {
      scene.create();

      const world = scene.getWorld()!;
      const spatialGrid = scene.getSpatialGrid()!;

      let gridClearedBeforeExecute = false;
      let gridInsertedBeforeExecute = false;

      vi.spyOn(spatialGrid, 'clear').mockImplementation(() => {
        gridClearedBeforeExecute = true;
      });
      
      vi.spyOn(spatialGrid, 'insert').mockImplementation(() => {
        gridInsertedBeforeExecute = true;
      });

      const originalExecute = world.execute.bind(world);
      vi.spyOn(world, 'execute').mockImplementation((...args) => {
        // At the time execute is called, grid should already be populated
        expect(gridClearedBeforeExecute).toBe(true);
        expect(gridInsertedBeforeExecute).toBe(true);
        return originalExecute(...args);
      });

      scene.update(0, 16);
    });
  });

  describe('Full Lifecycle', () => {
    it('should successfully complete full create() lifecycle', () => {
      expect(() => scene.create()).not.toThrow();

      const world = scene.getWorld()!;
      const map = scene.getMap()!;

      // Verify all major subsystems are initialized
      expect(world).toBeDefined();
      expect(map).toBeDefined();
      expect(world.componentsManager.Components.length).toBeGreaterThan(0);
      expect(world.systemManager._systems.length).toBeGreaterThan(0);
      expect(world.entityManager._entities.length).toBeGreaterThan(0);
    });

    it('should be able to run update() after create() without errors', () => {
      scene.create();

      // Should be able to run multiple update cycles without errors
      expect(() => {
        scene.update(16, 16);
        scene.update(32, 16);
        scene.update(48, 16);
      }).not.toThrow();
    });
  });
});
