import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { RenderingSystem } from '../RenderingSystem';
import { Position, Renderable } from '@/ecs/components';
import {
  createMockScene,
  createMockSceneWithTextures,
  createMockSceneWithoutTextures,
  createMockContainer,
  createMockSprite
} from '@/__tests__/helpers';

describe('RenderingSystem', () => {
  let world: World;
  let mockScene: any;
  let system: any;

  beforeEach(() => {
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Renderable);

    mockScene = createMockSceneWithoutTextures();
    // Register system first so ECSY query listeners work properly
    world.registerSystem(RenderingSystem, { scene: mockScene });
    system = world.getSystem(RenderingSystem);
  });

  describe('Initialization', () => {
    it('should initialize with scene', () => {
      expect(system.scene).toBe(mockScene);
    });

    it('should initialize sprite map', () => {
      expect(system.spriteMap).toBeInstanceOf(Map);
      expect(system.spriteMap.size).toBe(0);
    });
  });

  describe('Sprite Creation', () => {
    it('should create sprite for entity with Renderable', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      world.execute(16, 16);

      expect(mockScene.add.container).toHaveBeenCalledWith(100, 200);
    });

    it('should fallback to circle when sprite texture does not exist', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      world.execute(16, 16);

      expect(mockScene.add.circle).toHaveBeenCalledWith(0, 0, 10, 0xffff00);
      expect(mockScene.add.sprite).not.toHaveBeenCalled();
    });

    describe('with textures available', () => {
      let localWorld: World;
      let localScene: any;
      let localSystem: any;

      beforeEach(() => {
        localWorld = new World();
        localWorld
          .registerComponent(Position)
          .registerComponent(Renderable);

        localScene = createMockSceneWithTextures();
        localWorld.registerSystem(RenderingSystem, { scene: localScene });
        localSystem = localWorld.getSystem(RenderingSystem);
      });

      it('should use sprite when texture exists', () => {
        const entity = localWorld.createEntity();
        entity.addComponent(Position, { x: 100, y: 200 });
        entity.addComponent(Renderable, {
          type: 'firefly',
          sprite: 'firefly',
          color: 0xffff00,
          radius: 10
        });

        localWorld.execute(16, 16);

        expect(localScene.add.sprite).toHaveBeenCalledWith(0, 0, 'firefly');
        expect(localScene.add.circle).not.toHaveBeenCalled();
      });

      it('should scale sprite to match radius', () => {
        const mockSprite = createMockSprite(100, 100);
        const sceneWithCustomSprite = createMockScene({
          textureExists: () => true,
          spriteFactory: () => mockSprite
        });

        const customWorld = new World();
        customWorld
          .registerComponent(Position)
          .registerComponent(Renderable);
        customWorld.registerSystem(RenderingSystem, { scene: sceneWithCustomSprite });

        const entity = customWorld.createEntity();
        entity.addComponent(Position, { x: 100, y: 200 });
        entity.addComponent(Renderable, {
          type: 'firefly',
          sprite: 'firefly',
          color: 0xffff00,
          radius: 10
        });

        customWorld.execute(16, 16);

        const expectedScale = (10 * 2) / 100;
        expect(mockSprite.setScale).toHaveBeenCalledWith(expectedScale);
      });
    });

    it('should store sprite in sprite map', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const system = world.getSystem(RenderingSystem) as any;
      world.execute(16, 16);

      expect(system.spriteMap.has(entity)).toBe(true);
    });

    it('should handle entity without sprite property', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: undefined as any,
        color: 0xffff00,
        radius: 10
      });


      expect(() => world.execute(16, 16)).not.toThrow();
      expect(mockScene.add.circle).toHaveBeenCalled();
    });

    it('should handle errors during sprite creation gracefully', () => {
      mockScene.add.container.mockImplementation(() => {
        throw new Error('Scene error');
      });

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});


      expect(() => world.execute(16, 16)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Sprite Updates', () => {
    it('should update sprite position when entity moves', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      world.execute(16, 16);

      const pos = entity.getMutableComponent(Position)!;
      pos.x = 300;
      pos.y = 400;

      world.execute(16, 16);

      expect(mockContainer.setPosition).toHaveBeenCalledWith(300, 400);
    });

    it('should not throw if sprite not found in map', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const system = world.getSystem(RenderingSystem) as any;

      system.spriteMap.clear();

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle errors during sprite update gracefully', () => {
      const mockContainer = createMockContainer();
      mockContainer.setPosition.mockImplementation(() => {
        throw new Error('Update error');
      });
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      world.execute(16, 16);

      const pos = entity.getMutableComponent(Position)!;
      pos.x = 300;

      expect(() => world.execute(16, 16)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Sprite Destruction', () => {
    it('should destroy sprite when entity is removed', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const system = world.getSystem(RenderingSystem) as any;
      world.execute(16, 16);

      expect(system.spriteMap.has(entity)).toBe(true);

      entity.remove();
      world.execute(16, 16);

      expect(mockContainer.destroy).toHaveBeenCalled();
      expect(system.spriteMap.has(entity)).toBe(false);
    });

    it('should handle sprite destruction when sprite not in map', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const system = world.getSystem(RenderingSystem) as any;

      world.execute(16, 16);
      system.spriteMap.clear();
      entity.remove();

      expect(() => world.execute(16, 16)).not.toThrow();
    });

    it('should handle errors during sprite destruction gracefully', () => {
      const mockContainer = createMockContainer();
      mockContainer.destroy.mockImplementation(() => {
        throw new Error('Destroy error');
      });
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      world.execute(16, 16);

      entity.remove();

      expect(() => world.execute(16, 16)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getSpriteForEntity', () => {
    it('should return sprite container for entity', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const system = world.getSystem(RenderingSystem) as any;
      world.execute(16, 16);

      const sprite = system.getSpriteForEntity(entity);
      expect(sprite).toBe(mockContainer);
    });

    it('should return undefined for non-existent entity', () => {
      const entity = world.createEntity();

      const system = world.getSystem(RenderingSystem) as any;

      const sprite = system.getSpriteForEntity(entity);
      expect(sprite).toBeUndefined();
    });
  });

  describe('Multiple Entities', () => {
    it('should handle multiple entities with sprites', () => {
      const system = world.getSystem(RenderingSystem) as any;

      const entity1 = world.createEntity();
      entity1.addComponent(Position, { x: 100, y: 200 });
      entity1.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      const entity2 = world.createEntity();
      entity2.addComponent(Position, { x: 300, y: 400 });
      entity2.addComponent(Renderable, {
        type: 'monster',
        sprite: 'monster',
        color: 0xff0000,
        radius: 15
      });

      world.execute(16, 16);

      expect(system.spriteMap.size).toBe(2);
      expect(system.spriteMap.has(entity1)).toBe(true);
      expect(system.spriteMap.has(entity2)).toBe(true);
    });
  });

  describe('Scale and Tint Effects', () => {
    it('should apply scale to container when renderable scale changes', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10,
        scale: 1.5
      });

      world.execute(16, 16);

      expect(mockContainer.setScale).toHaveBeenCalledWith(1.5);
    });

    it('should default scale to 1.0 when not specified', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      world.execute(16, 16);

      expect(mockContainer.setScale).toHaveBeenCalledWith(1.0);
    });

    it('should update scale when renderable scale changes', () => {
      const mockContainer = createMockContainer();
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10,
        scale: 1.0
      });

      world.execute(16, 16);
      expect(mockContainer.setScale).toHaveBeenCalledWith(1.0);

      // Change scale
      const renderable = entity.getMutableComponent(Renderable)!;
      renderable.scale = 1.5;

      world.execute(16, 16);
      expect(mockContainer.setScale).toHaveBeenCalledWith(1.5);
    });

    it('should apply tint to sprite children when using sprite graphics', () => {
      const mockSprite = createMockSprite(100, 100);
      const mockContainer = createMockContainer();
      mockContainer.list = [mockSprite]; // Mock children list
      
      const sceneWithCustomSprite = createMockScene({
        textureExists: () => true,
        spriteFactory: () => mockSprite,
        containerFactory: () => mockContainer
      });

      const customWorld = new World();
      customWorld
        .registerComponent(Position)
        .registerComponent(Renderable);
      customWorld.registerSystem(RenderingSystem, { scene: sceneWithCustomSprite });

      const entity = customWorld.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10,
        tint: 0xff0000
      });

      customWorld.execute(16, 16);

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

      const customWorld = new World();
      customWorld
        .registerComponent(Position)
        .registerComponent(Renderable);
      customWorld.registerSystem(RenderingSystem, { scene: sceneWithCustomSprite });

      const entity = customWorld.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10
      });

      customWorld.execute(16, 16);

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

      const customWorld = new World();
      customWorld
        .registerComponent(Position)
        .registerComponent(Renderable);
      customWorld.registerSystem(RenderingSystem, { scene: sceneWithCustomSprite });

      const entity = customWorld.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        sprite: 'firefly',
        color: 0xffff00,
        radius: 10,
        tint: 0xFFFFFF
      });

      customWorld.execute(16, 16);
      expect(mockSprite.setTint).toHaveBeenCalledWith(0xFFFFFF);

      // Change tint
      const renderable = entity.getMutableComponent(Renderable)!;
      renderable.tint = 0xff0000;

      customWorld.execute(16, 16);
      expect(mockSprite.setTint).toHaveBeenCalledWith(0xff0000);
    });

    it('should apply tint to circle graphics when not using sprite', () => {
      const mockCircle = {
        setFillStyle: vi.fn()
      };
      const mockContainer = createMockContainer();
      mockScene.add.circle.mockReturnValue(mockCircle);
      mockScene.add.container.mockReturnValue(mockContainer);

      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 200 });
      entity.addComponent(Renderable, {
        type: 'firefly',
        color: 0xffff00,
        radius: 10,
        tint: 0xff0000
      });

      world.execute(16, 16);

      // For circles, we apply tint by modifying the fillStyle color
      expect(mockCircle.setFillStyle).toHaveBeenCalled();
    });
  });
});
