import { describe, it, expect, vi } from 'vitest';
import { pathfind } from '../pathfinding';

describe('Pathfinding', () => {
  describe('pathfind', () => {
    it('should return path from navmesh', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue([
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 }
        ])
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 }
      ]);
      expect(mockNavMesh.findPath).toHaveBeenCalledWith(start, destination);
    });

    it('should return null when navmesh returns null', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue(null)
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toBeNull();
    });

    it('should handle empty path', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue([])
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toEqual([]);
    });

    it('should handle single point path', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue([{ x: 50, y: 50 }])
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toEqual([{ x: 50, y: 50 }]);
    });

    it('should format path points correctly', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue([
          { x: 10.5, y: 20.7 },
          { x: 30.2, y: 40.9 }
        ])
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toEqual([
        { x: 10.5, y: 20.7 },
        { x: 30.2, y: 40.9 }
      ]);
    });

    it('should handle navmesh errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockNavMesh = {
        findPath: vi.fn().mockImplementation(() => {
          throw new Error('Pathfinding failed');
        })
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error finding path:',
        expect.any(Error),
        { start, destination }
      );

      consoleSpy.mockRestore();
    });

    it('should pass through exact point coordinates', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue([
          { x: 123.456, y: 789.012 }
        ])
      };

      const start = { x: 0.1, y: 0.2 };
      const destination = { x: 999.9, y: 888.8 };

      pathfind(mockNavMesh as any, start, destination);

      expect(mockNavMesh.findPath).toHaveBeenCalledWith(
        { x: 0.1, y: 0.2 },
        { x: 999.9, y: 888.8 }
      );
    });

    it('should handle negative coordinates', () => {
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue([
          { x: -50, y: -50 },
          { x: 0, y: 0 }
        ])
      };

      const start = { x: -100, y: -100 };
      const destination = { x: 0, y: 0 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toEqual([
        { x: -50, y: -50 },
        { x: 0, y: 0 }
      ]);
    });

    it('should handle very long paths', () => {
      const longPath = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i }));
      const mockNavMesh = {
        findPath: vi.fn().mockReturnValue(longPath)
      };

      const start = { x: 0, y: 0 };
      const destination = { x: 100, y: 100 };

      const result = pathfind(mockNavMesh as any, start, destination);

      expect(result).toEqual(longPath);
      expect(result?.length).toBe(100);
    });
  });
});
