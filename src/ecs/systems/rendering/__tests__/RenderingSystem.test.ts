import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import { RenderingSystem } from '../RenderingSystem';
import type { Entity, GameWorld } from '@/ecs/Entity';

function createMockContainer() {
  return {
    add: vi.fn(),
    setPosition: vi.fn(),
    setScale: vi.fn(),
    setDepth: vi.fn(),
    setRotation: vi.fn(),
    destroy: vi.fn(),
    remove: vi.fn(),
    addAt: vi.fn(),
    list: [] as any[]
  };
}

function createMockSprite(width = 100, height = 100) {
  return {
    width,
    height,
    setScale: vi.fn(),
    setPosition: vi.fn(),
    setTint: vi.fn(),
    destroy: vi.fn()
  };
}

function createMockCircle() {
  return {
    setPosition: vi.fn(),
    setFillStyle: vi.fn(),
    setTint: vi.fn(),
    destroy: vi.fn()
  };
}

function createMockGraphics() {
  return {
    fillStyle: vi.fn(),
    fillCircle: vi.fn(),
    setAlpha: vi.fn(),
    setBlendMode: vi.fn(),
    setData: vi.fn(),
    getData: vi.fn(),
    destroy: vi.fn()
  };
}

function createMockScene(opts: {
  textureExists?: (key: string) => boolean;
  spriteFactory?: () => any;
  containerFactory?: () => any;
} = {}) {
  const mockContainer = opts.containerFactory ?? createMockContainer;
  const mockSprite = opts.spriteFactory ?? (() => createMockSprite());
  const mockCircle = createMockCircle;

  return {
    add: {
      container: vi.fn((_x: number, _y: number) => mockContainer()),
      sprite: vi.fn((_x: number, _y: number, _key: string) => mockSprite()),
      circle: vi.fn((_x: number, _y: number, _r: number, _c: number) => mockCircle()),
      graphics: vi.fn(() => createMockGraphics())
    },
    textures: {
      exists: vi.fn(opts.textureExists ?? (() => false))
    }
  } as any;
}

function makeRenderable(overrides: Partial<Entity['renderable']> = {}): NonNullable<Entity['renderable']> {
  return {
    type: 'firefly',
    sprite: 'firefly',
    color: 0xffff00,
    radius: 10,
    alpha: 1,
    scale: 1,
    tint: 0xFFFFFF,
    rotation: 0,
    rotationSpeed: 0,
    depth: 50,
    offsetY: 0,
    ...overrides
  };
}

describe('RenderingSystem', () => {
  let world: GameWorld;
  let mockScene: any;
  let system: RenderingSystem;

  beforeEach(() => {
    world = new World<Entity>();
    mockScene = createMockScene();
    system = new RenderingSystem(world, { scene: mockScene });
  });

  describe('Initialization', () => {
    it('should initialize with scene', () => {
      expect((system as any).scene).toBe(mockScene);
    });

    it('should initialize sprite map', () => {
      expect((system as any).spriteMap).toBeInstanceOf(Map);
      expect((system as any).spriteMap.size).toBe(0);
    });
  });

  describe('Sprite Creation', () => {
    it('should create sprite for entity with renderable', () => {
      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      expect(mockScene.add.container).toHaveBeenCalledWith(100, 200);
    });

    it('should fallback to circle when sprite texture does not exist', () => {
      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      expect(mockScene.add.circle).toHaveBeenCalledWith(0, 0, 10, 0xffff00);
      expect(mockScene.add.sprite).not.toHaveBeenCalled();
    });

    describe('with textures available', () => {
      let localWorld: GameWorld;
      let localScene: any;
      let localSystem: RenderingSystem;

      beforeEach(() => {
        localWorld = new World<Entity>();
        localScene = createMockScene({ textureExists: () => true });
        localSystem = new RenderingSystem(localWorld, { scene: localScene });
      });

      it('should use sprite when texture exists', () => {
        localWorld.add({
          position: { x: 100, y: 200 },
          renderable: makeRenderable()
        });

        expect(localScene.add.sprite).toHaveBeenCalledWith(0, 0, 'firefly');
        expect(localScene.add.circle).not.toHaveBeenCalled();
      });

      it('should scale sprite to match radius', () => {
        const mockSprite = createMockSprite(100, 100);
        const sceneWithCustomSprite = createMockScene({
          textureExists: () => true,
          spriteFactory: () => mockSprite
        });

        const customWorld = new World<Entity>();
        new RenderingSystem(customWorld, { scene: sceneWithCustomSprite });

        customWorld.add({
          position: { x: 100, y: 200 },
          renderable: makeRenderable()
        });

        const expectedScale = (10 * 2) / 100;
        expect(mockSprite.setScale).toHaveBeenCalledWith(expectedScale);
      });
    });

    it('should store sprite in sprite map', () => {
      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      expect((system as any).spriteMap.has(entity)).toBe(true);
    });

    it('should handle entity without sprite property', () => {
      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({ sprite: undefined })
      });

      expect(mockScene.add.circle).toHaveBeenCalled();
    });

    it('should handle errors during sprite creation gracefully', () => {
      mockScene.add.container.mockImplementation(() => {
        throw new Error('Scene error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        world.add({
          position: { x: 100, y: 200 },
          renderable: makeRenderable()
        });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Sprite Updates', () => {
    it('should update sprite position when entity moves', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      entity.position!.x = 300;
      entity.position!.y = 400;

      system.update(16, 16);

      expect(mockContainer.setPosition).toHaveBeenCalledWith(300, 400);
    });

    it('should not throw if sprite not found in map', () => {
      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      (system as any).spriteMap.clear();

      expect(() => system.update(16, 16)).not.toThrow();
    });

    it('should handle errors during sprite update gracefully', () => {
      const mockContainer = createMockContainer();
      mockContainer.setPosition.mockImplementation(() => {
        throw new Error('Update error');
      });
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      entity.position!.x = 300;

      expect(() => system.update(16, 16)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Sprite Destruction', () => {
    it('should destroy sprite when entity is removed', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      expect((system as any).spriteMap.has(entity)).toBe(true);

      world.remove(entity);

      expect(mockContainer.destroy).toHaveBeenCalled();
      expect((system as any).spriteMap.has(entity)).toBe(false);
    });

    it('should handle sprite destruction when sprite not in map', () => {
      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      (system as any).spriteMap.clear();

      expect(() => world.remove(entity)).not.toThrow();
    });

    it('should handle errors during sprite destruction gracefully', () => {
      const mockContainer = createMockContainer();
      mockContainer.destroy.mockImplementation(() => {
        throw new Error('Destroy error');
      });
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => world.remove(entity)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getSpriteForEntity', () => {
    it('should return sprite container for entity', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      const sprite = system.getSpriteForEntity(entity);
      expect(sprite).toBe(mockContainer);
    });

    it('should return undefined for non-existent entity', () => {
      const entity = world.add({ position: { x: 0, y: 0 } });

      const sprite = system.getSpriteForEntity(entity);
      expect(sprite).toBeUndefined();
    });
  });

  describe('Multiple Entities', () => {
    it('should handle multiple entities with sprites', () => {
      const entity1 = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      const entity2 = world.add({
        position: { x: 300, y: 400 },
        renderable: makeRenderable({ type: 'monster', sprite: 'monster', color: 0xff0000, radius: 15 })
      });

      expect((system as any).spriteMap.size).toBe(2);
      expect((system as any).spriteMap.has(entity1)).toBe(true);
      expect((system as any).spriteMap.has(entity2)).toBe(true);
    });
  });

  describe('Scale and Tint Effects', () => {
    it('should apply scale to container when renderable scale changes', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({ scale: 1.5 })
      });

      expect(mockContainer.setScale).toHaveBeenCalledWith(1.5);
    });

    it('should default scale to 1.0 when not specified', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      expect(mockContainer.setScale).toHaveBeenCalledWith(1.0);
    });

    it('should update scale when renderable scale changes', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({ scale: 1.0 })
      });

      expect(mockContainer.setScale).toHaveBeenCalledWith(1.0);

      entity.renderable!.scale = 1.5;

      system.update(16, 16);
      expect(mockContainer.setScale).toHaveBeenCalledWith(1.5);
    });

    it('should apply tint to sprite children when using sprite graphics', () => {
      const mockSprite = createMockSprite(100, 100);
      const mockContainer = createMockContainer();
      mockContainer.list = [mockSprite];

      const sceneWithCustomSprite = createMockScene({
        textureExists: () => true,
        spriteFactory: () => mockSprite,
        containerFactory: () => mockContainer
      });

      const customWorld = new World<Entity>();
      new RenderingSystem(customWorld, { scene: sceneWithCustomSprite });

      customWorld.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({ tint: 0xff0000 })
      });

      expect(mockSprite.setTint).toHaveBeenCalledWith(0xff0000);
    });

    it('should default tint to 0xFFFFFF when not specified', () => {
      const mockSprite = createMockSprite(100, 100);
      const mockContainer = createMockContainer();
      mockContainer.list = [mockSprite];

      const sceneWithCustomSprite = createMockScene({
        textureExists: () => true,
        spriteFactory: () => mockSprite,
        containerFactory: () => mockContainer
      });

      const customWorld = new World<Entity>();
      new RenderingSystem(customWorld, { scene: sceneWithCustomSprite });

      customWorld.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable()
      });

      expect(mockSprite.setTint).toHaveBeenCalledWith(0xFFFFFF);
    });

    it('should update tint when renderable tint changes', () => {
      const mockSprite = createMockSprite(100, 100);
      const mockContainer = createMockContainer();
      mockContainer.list = [mockSprite];

      const sceneWithCustomSprite = createMockScene({
        textureExists: () => true,
        spriteFactory: () => mockSprite,
        containerFactory: () => mockContainer
      });

      const customWorld = new World<Entity>();
      const customSystem = new RenderingSystem(customWorld, { scene: sceneWithCustomSprite });

      const entity = customWorld.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({ tint: 0xFFFFFF })
      });

      expect(mockSprite.setTint).toHaveBeenCalledWith(0xFFFFFF);

      entity.renderable!.tint = 0xff0000;

      customSystem.update(16, 16);
      expect(mockSprite.setTint).toHaveBeenCalledWith(0xff0000);
    });

    it('should apply tint to circle graphics when not using sprite', () => {
      const mockCircle = {
        setFillStyle: vi.fn(),
        setPosition: vi.fn()
      };
      const mockContainer = createMockContainer();
      mockContainer.list = [mockCircle];
      mockScene.add.circle.mockReturnValue(mockCircle);
      mockScene.add.container.mockReturnValue(mockContainer);

      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({ tint: 0xff0000 })
      });

      expect(mockCircle.setFillStyle).toHaveBeenCalled();
    });
  });

  describe('Glow Effects', () => {
    it('should add glow graphics when renderable has glow configuration', () => {
      const mockGlowGraphics = createMockGraphics();
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);
      mockScene.add.graphics.mockReturnValue(mockGlowGraphics);

      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({
          color: 0xDEF4B4,
          radius: 4,
          glow: {
            radius: 20,
            color: 0xDEF4B4,
            intensity: 0.6
          }
        })
      });

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should update glow intensity with pulsing animation', () => {
      const entity = world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({
          color: 0xDEF4B4,
          radius: 4,
          glow: {
            radius: 20,
            color: 0xDEF4B4,
            intensity: 0.6,
            pulse: {
              enabled: true,
              speed: 1.0,
              minIntensity: 0.4,
              maxIntensity: 0.8
            }
          }
        })
      });

      system.update(16, 16);
      system.update(500, 516);
      system.update(500, 1016);

      expect(entity.renderable!.glow).toBeDefined();
    });

    it('should not create glow graphics when glow config is undefined', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      world.add({
        position: { x: 100, y: 200 },
        renderable: makeRenderable({
          color: 0xDEF4B4,
          radius: 4
        })
      });

      expect(mockScene.add.graphics).not.toHaveBeenCalled();
    });
  });
});
