import { describe, it, expect } from 'vitest';
import { generateNavMesh, shrinkPaths, wallsToPaths } from '../navmesh';

describe('NavMesh Utilities', () => {
  describe('wallsToPaths', () => {
    it('should convert walls to closed paths', () => {
      const walls = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ]
      ];

      const result = wallsToPaths(walls);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(4);
      expect(result[0][0]).toEqual({ x: 0, y: 0 });
      expect(result[0][result[0].length - 1]).toEqual({ x: 0, y: 0 });
    });

    it('should not duplicate closing point if already closed', () => {
      const walls = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = wallsToPaths(walls);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(4);
    });

    it('should handle multiple walls', () => {
      const walls = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ],
        [
          { x: 200, y: 200 },
          { x: 300, y: 200 },
          { x: 300, y: 300 }
        ]
      ];

      const result = wallsToPaths(walls);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toEqual({ x: 0, y: 0 });
      expect(result[1][0]).toEqual({ x: 200, y: 200 });
    });

    it('should filter out null or empty walls', () => {
      const walls = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        [],
        null as any,
        [
          { x: 200, y: 200 },
          { x: 300, y: 200 }
        ]
      ];

      const result = wallsToPaths(walls);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toEqual({ x: 0, y: 0 });
      expect(result[1][0]).toEqual({ x: 200, y: 200 });
    });

    it('should handle empty walls array', () => {
      const walls: any[] = [];

      const result = wallsToPaths(walls);

      expect(result).toEqual([]);
    });

    it('should handle single point walls', () => {
      const walls = [
        [{ x: 50, y: 50 }]
      ];

      const result = wallsToPaths(walls);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0]).toEqual({ x: 50, y: 50 });
    });

    it('should handle walls with decimal coordinates', () => {
      const walls = [
        [
          { x: 10.5, y: 20.7 },
          { x: 30.2, y: 40.9 }
        ]
      ];

      const result = wallsToPaths(walls);

      expect(result[0][0]).toEqual({ x: 10.5, y: 20.7 });
      expect(result[0][1]).toEqual({ x: 30.2, y: 40.9 });
    });
  });

  describe('shrinkPaths', () => {
    it('should shrink paths by given radius', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = shrinkPaths(paths, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multiple paths', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ],
        [
          { x: 20, y: 20 },
          { x: 40, y: 20 },
          { x: 40, y: 40 },
          { x: 20, y: 40 },
          { x: 20, y: 20 }
        ]
      ];

      const result = shrinkPaths(paths, 2);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero radius', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = shrinkPaths(paths, 0);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle small radius', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = shrinkPaths(paths, 1);

      expect(result).toBeDefined();
      expect(result[0]).toBeDefined();
    });
  });

  describe('generateNavMesh', () => {
    it('should generate navmesh from paths', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = generateNavMesh(paths);

      expect(result).toBeDefined();
      expect(typeof result.findPath).toBe('function');
    });

    it('should generate navmesh with multiple paths', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 200 },
          { x: 0, y: 200 },
          { x: 0, y: 0 }
        ],
        [
          { x: 50, y: 50 },
          { x: 80, y: 50 },
          { x: 80, y: 80 },
          { x: 50, y: 80 },
          { x: 50, y: 50 }
        ]
      ];

      const result = generateNavMesh(paths);

      expect(result).toBeDefined();
      expect(typeof result.findPath).toBe('function');
    });

    it('should create navmesh that can find paths', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const navmesh = generateNavMesh(paths);
      const path = navmesh.findPath({ x: 10, y: 10 }, { x: 90, y: 90 });

      expect(path).toBeDefined();
    });

    it('should handle complex multi-room layouts', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
          { x: 300, y: 200 },
          { x: 0, y: 200 },
          { x: 0, y: 0 }
        ],
        [
          { x: 50, y: 50 },
          { x: 100, y: 50 },
          { x: 100, y: 100 },
          { x: 50, y: 100 },
          { x: 50, y: 50 }
        ],
        [
          { x: 200, y: 50 },
          { x: 250, y: 50 },
          { x: 250, y: 100 },
          { x: 200, y: 100 },
          { x: 200, y: 50 }
        ]
      ];

      const result = generateNavMesh(paths);

      expect(result).toBeDefined();
      expect(typeof result.findPath).toBe('function');
    });

    it('should handle triangular paths', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = generateNavMesh(paths);

      expect(result).toBeDefined();
    });

    it('should handle irregular polygons', () => {
      const paths = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 150, y: 50 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 }
        ]
      ];

      const result = generateNavMesh(paths);

      expect(result).toBeDefined();
    });
  });
});
