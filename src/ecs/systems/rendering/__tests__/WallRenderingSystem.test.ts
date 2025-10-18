import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { WallRenderingSystem } from '../WallRenderingSystem';
import { Wall } from '@/ecs/components';
import { createMockScene, createMockGraphics } from '@/__tests__/helpers';

describe('WallRenderingSystem', () => {
  let world: World;
  let mockScene: any;
  let mockGraphics: any;
  let system: any;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Wall);

    mockGraphics = createMockGraphics();
    mockScene = createMockScene({
      graphicsFactory: () => mockGraphics
    });

    world.registerSystem(WallRenderingSystem, { scene: mockScene });
    system = world.getSystem(WallRenderingSystem);
  });

  describe('Initialization', () => {
    it('should initialize with scene', () => {
      expect(system.scene).toBe(mockScene);
    });

    it('should create graphics object', () => {
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(system.graphics).toBe(mockGraphics);
    });

    it('should initialize wallsDrawn flag to false', () => {
      expect(system.wallsDrawn).toBe(false);
    });
  });

  describe('Wall Rendering', () => {
    it('should draw walls on first execution', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(2, 0x333333);
      expect(mockGraphics.beginPath).toHaveBeenCalled();
      expect(mockGraphics.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockGraphics.lineTo).toHaveBeenCalled();
      expect(mockGraphics.strokePath).toHaveBeenCalled();
    });

    it('should draw multiple wall segments', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ],
          [
            { x: 200, y: 200 },
            { x: 300, y: 300 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);

      expect(mockGraphics.beginPath).toHaveBeenCalledTimes(2);
      expect(mockGraphics.strokePath).toHaveBeenCalledTimes(2);
    });

    it('should draw all points in a segment', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
            { x: 100, y: 0 },
            { x: 150, y: 50 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);

      expect(mockGraphics.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(50, 50);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(100, 0);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(150, 50);
    });

    it('should not draw segment with less than 2 points', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);

      expect(mockGraphics.beginPath).not.toHaveBeenCalled();
    });

    it('should not draw segment with empty array', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [[]],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);

      expect(mockGraphics.beginPath).not.toHaveBeenCalled();
    });

    it('should only draw walls once', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);
      world.execute(16, 16);
      world.execute(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledTimes(1);
    });

    it('should set wallsDrawn flag after drawing', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      expect(system.wallsDrawn).toBe(false);

      world.execute(16, 16);

      expect(system.wallsDrawn).toBe(true);
    });

    it('should use wall thickness and color from component', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ]
        ],
        thickness: 5,
        color: 0xff0000
      });

      world.execute(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(5, 0xff0000);
    });

    it('should handle multiple wall entities', () => {
      const entity1 = world.createEntity();
      entity1.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      const entity2 = world.createEntity();
      entity2.addComponent(Wall, {
        segments: [
          [
            { x: 200, y: 200 },
            { x: 300, y: 300 }
          ]
        ],
        thickness: 3,
        color: 0x666666
      });

      world.execute(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(2, 0x333333);
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(3, 0x666666);
    });

    it('should handle entity with no segments', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [],
        thickness: 2,
        color: 0x333333
      });

      expect(() => world.execute(16, 16)).not.toThrow();
    });
  });

  describe('Early Exit Optimization', () => {
    it('should skip execution after walls are drawn', () => {
      const entity = world.createEntity();
      entity.addComponent(Wall, {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ]
        ],
        thickness: 2,
        color: 0x333333
      });

      world.execute(16, 16);

      mockGraphics.lineStyle.mockClear();

      world.execute(16, 16);

      expect(mockGraphics.lineStyle).not.toHaveBeenCalled();
    });
  });
});
