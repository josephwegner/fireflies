import { describe, it, expect, vi } from 'vitest';
import { pathfind } from '../pathfinding';

function mockNavMesh(findPathReturn: any) {
  return {
    findPath: vi.fn().mockReturnValue(findPathReturn),
    isPointInMesh: vi.fn().mockReturnValue(true),
    findClosestMeshPoint: vi.fn()
  };
}

describe('Pathfinding', () => {
  describe('pathfind', () => {
    it('should return path from navmesh', () => {
      const nav = mockNavMesh([
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 }
      ]);

      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });

      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 }
      ]);
    });

    it('should return null when navmesh returns null', () => {
      const nav = mockNavMesh(null);
      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });
      expect(result).toBeNull();
    });

    it('should handle empty path', () => {
      const nav = mockNavMesh([]);
      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });
      expect(result).toEqual([]);
    });

    it('should handle single point path', () => {
      const nav = mockNavMesh([{ x: 50, y: 50 }]);
      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });
      expect(result).toEqual([{ x: 50, y: 50 }]);
    });

    it('should format path points correctly', () => {
      const nav = mockNavMesh([
        { x: 10.5, y: 20.7 },
        { x: 30.2, y: 40.9 }
      ]);

      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });

      expect(result).toEqual([
        { x: 10.5, y: 20.7 },
        { x: 30.2, y: 40.9 }
      ]);
    });

    it('should handle navmesh errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const nav = {
        findPath: vi.fn().mockImplementation(() => { throw new Error('Pathfinding failed'); }),
        isPointInMesh: vi.fn().mockReturnValue(true),
        findClosestMeshPoint: vi.fn()
      };

      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error finding path:',
        expect.any(Error),
        { start: { x: 0, y: 0 }, destination: { x: 100, y: 100 } }
      );

      consoleSpy.mockRestore();
    });

    it('should pass through exact coordinates when points are in mesh', () => {
      const nav = mockNavMesh([{ x: 123.456, y: 789.012 }]);

      pathfind(nav as any, { x: 0.1, y: 0.2 }, { x: 999.9, y: 888.8 });

      expect(nav.findPath).toHaveBeenCalledWith(
        { x: 0.1, y: 0.2 },
        { x: 999.9, y: 888.8 }
      );
    });

    it('should handle negative coordinates', () => {
      const nav = mockNavMesh([{ x: -50, y: -50 }, { x: 0, y: 0 }]);
      const result = pathfind(nav as any, { x: -100, y: -100 }, { x: 0, y: 0 });
      expect(result).toEqual([{ x: -50, y: -50 }, { x: 0, y: 0 }]);
    });

    it('should handle very long paths', () => {
      const longPath = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i }));
      const nav = mockNavMesh(longPath);
      const result = pathfind(nav as any, { x: 0, y: 0 }, { x: 100, y: 100 });
      expect(result).toEqual(longPath);
      expect(result?.length).toBe(100);
    });

    it('should snap start point to mesh when outside', () => {
      const nav = {
        findPath: vi.fn().mockReturnValue([{ x: 5, y: 5 }, { x: 50, y: 50 }]),
        isPointInMesh: vi.fn().mockImplementation((p: any) => p.x !== 0),
        findClosestMeshPoint: vi.fn().mockReturnValue({ point: { x: 5, y: 5 }, distance: 5, polygon: {} })
      };

      pathfind(nav as any, { x: 0, y: 0 }, { x: 50, y: 50 });

      expect(nav.findClosestMeshPoint).toHaveBeenCalledWith(expect.objectContaining({ x: 0, y: 0 }), 20);
      expect(nav.findPath).toHaveBeenCalledWith({ x: 5, y: 5 }, { x: 50, y: 50 });
    });

    it('should snap destination point to mesh when outside', () => {
      const nav = {
        findPath: vi.fn().mockReturnValue([{ x: 0, y: 0 }, { x: 45, y: 45 }]),
        isPointInMesh: vi.fn().mockImplementation((p: any) => p.x !== 50),
        findClosestMeshPoint: vi.fn().mockReturnValue({ point: { x: 45, y: 45 }, distance: 5, polygon: {} })
      };

      pathfind(nav as any, { x: 0, y: 0 }, { x: 50, y: 50 });

      expect(nav.findClosestMeshPoint).toHaveBeenCalledWith(expect.objectContaining({ x: 50, y: 50 }), 20);
      expect(nav.findPath).toHaveBeenCalledWith({ x: 0, y: 0 }, { x: 45, y: 45 });
    });
  });
});
