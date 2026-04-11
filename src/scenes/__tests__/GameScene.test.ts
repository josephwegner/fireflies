import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('phaser', () => {
  return {
    default: {
      Scene: class Scene {
        scene = { key: '' };
        constructor(key: string) {
          this.scene.key = key;
        }
      },
      BlendModes: { ADD: 1 }
    }
  };
});

vi.mock('@/assets', () => ({
  AssetLoader: {
    preloadAll: vi.fn()
  }
}));

vi.mock('@/ecs/WorldManager', () => {
  const mockWorldManager = {
    world: {
      add: vi.fn((entity: any) => entity),
      with: vi.fn(() => ({ entities: [] })),
      without: vi.fn(() => ({ entities: [] })),
      clear: vi.fn()
    },
    spatialGrid: {
      clear: vi.fn(),
      insert: vi.fn()
    },
    update: vi.fn(),
    destroy: vi.fn()
  };

  return {
    WorldManager: vi.fn(() => mockWorldManager)
  };
});

vi.mock('@/levels/level1', () => ({
  LEVEL_1_MAP: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ],
  loadLevel: vi.fn()
}));

import { GameScene } from '../GameScene';
import { AssetLoader } from '@/assets';
import { WorldManager } from '@/ecs/WorldManager';
import { loadLevel } from '@/levels/level1';

class TestableGameScene extends GameScene {
  constructor() {
    super();

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

    (this as any).cameras = {
      main: {
        setBackgroundColor: vi.fn()
      }
    };

    (this as any).load = {
      image: vi.fn(),
      audio: vi.fn(),
      spritesheet: vi.fn()
    };
  }

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

  describe('create', () => {
    it('should create a WorldManager', () => {
      scene.create();

      expect(WorldManager).toHaveBeenCalledWith(
        scene,
        expect.anything(),
        expect.any(Array)
      );
    });

    it('should load level with world from WorldManager', () => {
      scene.create();

      const worldManagerInstance = (WorldManager as any).mock.results[0].value;
      expect(loadLevel).toHaveBeenCalledWith(worldManagerInstance.world);
    });

    it('should complete without errors', () => {
      expect(() => scene.create()).not.toThrow();
    });
  });

  describe('update', () => {
    it('should call worldManager.update with correct parameters', () => {
      scene.create();

      const worldManagerInstance = (WorldManager as any).mock.results[0].value;

      scene.update(500, 32);

      expect(worldManagerInstance.update).toHaveBeenCalledWith(32, 500);
    });

    it('should call worldManager.update on each tick', () => {
      scene.create();

      const worldManagerInstance = (WorldManager as any).mock.results[0].value;

      scene.update(100, 16);
      scene.update(116, 16);
      scene.update(132, 16);

      expect(worldManagerInstance.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('Full Lifecycle', () => {
    it('should successfully complete full create() lifecycle', () => {
      expect(() => scene.create()).not.toThrow();
      expect(WorldManager).toHaveBeenCalled();
      expect(loadLevel).toHaveBeenCalled();
    });

    it('should be able to run update() after create() without errors', () => {
      scene.create();

      expect(() => {
        scene.update(16, 16);
        scene.update(32, 16);
        scene.update(48, 16);
      }).not.toThrow();
    });
  });
});
