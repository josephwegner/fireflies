import { describe, it, expect } from 'vitest';
import {
  nearestPointOnPolyline,
  raySegmentIntersection,
  pointToSegmentDistance,
  lineSegmentToRect
} from '../geometry';

describe('geometry utilities', () => {
  describe('pointToSegmentDistance', () => {
    it('should return 0 when point is on the segment', () => {
      expect(pointToSegmentDistance({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
    });

    it('should return perpendicular distance for a point beside the segment', () => {
      const dist = pointToSegmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
      expect(dist).toBeCloseTo(3, 5);
    });

    it('should return distance to nearest endpoint when projection falls outside segment', () => {
      const dist = pointToSegmentDistance({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 });
      expect(dist).toBeCloseTo(5, 5);
    });

    it('should handle vertical segments', () => {
      const dist = pointToSegmentDistance({ x: 3, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 });
      expect(dist).toBeCloseTo(3, 5);
    });

    it('should handle zero-length segment (point)', () => {
      const dist = pointToSegmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
      expect(dist).toBeCloseTo(5, 5);
    });
  });

  describe('nearestPointOnPolyline', () => {
    it('should find nearest point on a straight polyline', () => {
      const polyline = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
      const result = nearestPointOnPolyline({ x: 5, y: 3 }, polyline);

      expect(result.point.x).toBeCloseTo(5, 5);
      expect(result.point.y).toBeCloseTo(0, 5);
      expect(result.distance).toBeCloseTo(3, 5);
      expect(result.segmentIndex).toBe(0);
    });

    it('should return correct segment index for second segment', () => {
      const polyline = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
      const result = nearestPointOnPolyline({ x: 15, y: 3 }, polyline);

      expect(result.point.x).toBeCloseTo(15, 5);
      expect(result.segmentIndex).toBe(1);
    });

    it('should snap to endpoint when closest point is at a vertex', () => {
      const polyline = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      const result = nearestPointOnPolyline({ x: -5, y: 0 }, polyline);

      expect(result.point.x).toBeCloseTo(0, 5);
      expect(result.point.y).toBeCloseTo(0, 5);
    });

    it('should handle L-shaped polyline', () => {
      const polyline = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
      const result = nearestPointOnPolyline({ x: 12, y: 5 }, polyline);

      expect(result.point.x).toBeCloseTo(10, 5);
      expect(result.point.y).toBeCloseTo(5, 5);
      expect(result.segmentIndex).toBe(1);
    });

    it('should throw for polyline with fewer than 2 points', () => {
      expect(() => nearestPointOnPolyline({ x: 0, y: 0 }, [{ x: 0, y: 0 }])).toThrow();
    });
  });

  describe('raySegmentIntersection', () => {
    it('should find intersection of a horizontal ray with a vertical segment', () => {
      const result = raySegmentIntersection(
        { x: 0, y: 5 },
        { x: 1, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 }
      );

      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(10, 5);
      expect(result!.y).toBeCloseTo(5, 5);
    });

    it('should return null when ray points away from segment', () => {
      const result = raySegmentIntersection(
        { x: 0, y: 5 },
        { x: -1, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 }
      );

      expect(result).toBeNull();
    });

    it('should return null when ray is parallel to segment', () => {
      const result = raySegmentIntersection(
        { x: 0, y: 5 },
        { x: 1, y: 0 },
        { x: 0, y: 10 },
        { x: 20, y: 10 }
      );

      expect(result).toBeNull();
    });

    it('should return null when ray misses the segment (hits line but outside endpoints)', () => {
      const result = raySegmentIntersection(
        { x: 0, y: 15 },
        { x: 1, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 }
      );

      expect(result).toBeNull();
    });

    it('should find intersection with diagonal ray and segment', () => {
      const result = raySegmentIntersection(
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 5, y: 0 },
        { x: 5, y: 10 }
      );

      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(5, 5);
      expect(result!.y).toBeCloseTo(5, 5);
    });

    it('should handle ray hitting segment endpoint', () => {
      const result = raySegmentIntersection(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 10 }
      );

      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(5, 5);
      expect(result!.y).toBeCloseTo(0, 5);
    });
  });

  describe('lineSegmentToRect', () => {
    it('should generate a rectangle around a horizontal segment', () => {
      const rect = lineSegmentToRect({ x: 0, y: 0 }, { x: 10, y: 0 }, 4);

      expect(rect).toHaveLength(4);
      // Rectangle should be 4 units wide (2 on each side of the line)
      // All y values should be either 2 or -2
      const ys = rect.map(p => p.y);
      expect(Math.max(...ys)).toBeCloseTo(2, 5);
      expect(Math.min(...ys)).toBeCloseTo(-2, 5);
    });

    it('should generate a rectangle around a vertical segment', () => {
      const rect = lineSegmentToRect({ x: 0, y: 0 }, { x: 0, y: 10 }, 4);

      expect(rect).toHaveLength(4);
      const xs = rect.map(p => p.x);
      expect(Math.max(...xs)).toBeCloseTo(2, 5);
      expect(Math.min(...xs)).toBeCloseTo(-2, 5);
    });

    it('should generate a rectangle around a diagonal segment', () => {
      const rect = lineSegmentToRect({ x: 0, y: 0 }, { x: 10, y: 10 }, 4);

      expect(rect).toHaveLength(4);
      // Should form a valid polygon (non-zero area)
      const area = polygonArea(rect);
      // Area should be approximately length * thickness = sqrt(200) * 4 ≈ 56.57
      expect(area).toBeGreaterThan(50);
      expect(area).toBeLessThan(65);
    });
  });
});

// Helper for testing polygon area (shoelace formula)
function polygonArea(points: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}
