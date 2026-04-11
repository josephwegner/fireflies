import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import { WallRenderingSystem } from '../WallRenderingSystem';
import type { Entity, GameWorld } from '@/ecs/Entity';

function createMockGraphics() {
  return {
    lineStyle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokePath: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn()
  };
}

function createMockScene(mockGraphics: any) {
  return {
    add: {
      graphics: vi.fn(() => mockGraphics)
    }
  } as any;
}

describe('WallRenderingSystem', () => {
  let world: GameWorld;
  let mockScene: any;
  let mockGraphics: any;
  let system: WallRenderingSystem;

  beforeEach(() => {
    world = new World<Entity>();
    mockGraphics = createMockGraphics();
    mockScene = createMockScene(mockGraphics);
    system = new WallRenderingSystem(world, { scene: mockScene });
  });

  describe('Initialization', () => {
    it('should initialize with scene', () => {
      expect((system as any).scene).toBe(mockScene);
    });

    it('should create graphics object', () => {
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect((system as any).graphics).toBe(mockGraphics);
    });

    it('should initialize wallsDrawn flag to false', () => {
      expect((system as any).wallsDrawn).toBe(false);
    });
  });

  describe('Wall Rendering', () => {
    it('should draw walls on first execution', () => {
      world.add({
        wall: {
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
        }
      });

      system.update(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(2, 0x333333);
      expect(mockGraphics.beginPath).toHaveBeenCalled();
      expect(mockGraphics.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockGraphics.lineTo).toHaveBeenCalled();
      expect(mockGraphics.strokePath).toHaveBeenCalled();
    });

    it('should draw multiple wall segments', () => {
      world.add({
        wall: {
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
        }
      });

      system.update(16, 16);

      expect(mockGraphics.beginPath).toHaveBeenCalledTimes(2);
      expect(mockGraphics.strokePath).toHaveBeenCalledTimes(2);
    });

    it('should draw all points in a segment', () => {
      world.add({
        wall: {
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
        }
      });

      system.update(16, 16);

      expect(mockGraphics.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(50, 50);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(100, 0);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(150, 50);
    });

    it('should not draw segment with less than 2 points', () => {
      world.add({
        wall: {
          segments: [
            [{ x: 0, y: 0 }]
          ],
          thickness: 2,
          color: 0x333333
        }
      });

      system.update(16, 16);

      expect(mockGraphics.beginPath).not.toHaveBeenCalled();
    });

    it('should not draw segment with empty array', () => {
      world.add({
        wall: {
          segments: [[]],
          thickness: 2,
          color: 0x333333
        }
      });

      system.update(16, 16);

      expect(mockGraphics.beginPath).not.toHaveBeenCalled();
    });

    it('should only draw walls once', () => {
      world.add({
        wall: {
          segments: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 }
            ]
          ],
          thickness: 2,
          color: 0x333333
        }
      });

      system.update(16, 16);
      system.update(16, 16);
      system.update(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledTimes(1);
    });

    it('should set wallsDrawn flag after drawing', () => {
      world.add({
        wall: {
          segments: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 }
            ]
          ],
          thickness: 2,
          color: 0x333333
        }
      });

      expect((system as any).wallsDrawn).toBe(false);

      system.update(16, 16);

      expect((system as any).wallsDrawn).toBe(true);
    });

    it('should use wall thickness and color from component', () => {
      world.add({
        wall: {
          segments: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 }
            ]
          ],
          thickness: 5,
          color: 0xff0000
        }
      });

      system.update(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(5, 0xff0000);
    });

    it('should handle multiple wall entities', () => {
      world.add({
        wall: {
          segments: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 }
            ]
          ],
          thickness: 2,
          color: 0x333333
        }
      });

      world.add({
        wall: {
          segments: [
            [
              { x: 200, y: 200 },
              { x: 300, y: 300 }
            ]
          ],
          thickness: 3,
          color: 0x666666
        }
      });

      system.update(16, 16);

      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(2, 0x333333);
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(3, 0x666666);
    });

    it('should handle entity with no segments', () => {
      world.add({
        wall: {
          segments: [],
          thickness: 2,
          color: 0x333333
        }
      });

      expect(() => system.update(16, 16)).not.toThrow();
    });
  });

  describe('Early Exit Optimization', () => {
    it('should skip execution after walls are drawn', () => {
      world.add({
        wall: {
          segments: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 }
            ]
          ],
          thickness: 2,
          color: 0x333333
        }
      });

      system.update(16, 16);

      mockGraphics.lineStyle.mockClear();

      system.update(16, 16);

      expect(mockGraphics.lineStyle).not.toHaveBeenCalled();
    });
  });
});
