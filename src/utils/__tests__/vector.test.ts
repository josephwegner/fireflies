import { describe, it, expect } from 'vitest';
import { Vector, Vector2D } from '../vector';
import { FLOAT_PRECISION } from '@/__tests__/helpers';

describe('Vector Utils', () => {
  describe('length', () => {
    it('should calculate length of vector', () => {
      expect(Vector.length(3, 4)).toBe(5);
      expect(Vector.length(0, 0)).toBe(0);
      expect(Vector.length(1, 0)).toBe(1);
      expect(Vector.length(0, 1)).toBe(1);
    });

    it('should handle negative values', () => {
      expect(Vector.length(-3, -4)).toBe(5);
      expect(Vector.length(-3, 4)).toBe(5);
    });

    it('should handle very large values', () => {
      const result = Vector.length(1e10, 1e10);
      // For very large numbers, verify it's within reasonable range
      // Exact: 14142135623.730951
      expect(result).toBeGreaterThan(1.414e10);
      expect(result).toBeLessThan(1.415e10);
    });

    it('should handle very small values', () => {
      const result = Vector.length(0.0001, 0.0001);
      expect(result).toBeCloseTo(0.00014142, FLOAT_PRECISION.STANDARD);
    });
  });

  describe('normalize', () => {
    it('should normalize vector to unit length', () => {
      const result = Vector.normalize(3, 4);
      expect(result.x).toBeCloseTo(0.6, FLOAT_PRECISION.STANDARD);
      expect(result.y).toBeCloseTo(0.8, FLOAT_PRECISION.STANDARD);
      expect(Vector.length(result.x, result.y)).toBeCloseTo(1, FLOAT_PRECISION.STANDARD);
    });

    it('should handle zero vector', () => {
      const result = Vector.normalize(0, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle negative values', () => {
      const result = Vector.normalize(-3, -4);
      expect(result.x).toBeCloseTo(-0.6, FLOAT_PRECISION.STANDARD);
      expect(result.y).toBeCloseTo(-0.8, FLOAT_PRECISION.STANDARD);
    });

    it('should handle already normalized vector', () => {
      const result = Vector.normalize(1, 0);
      expect(result.x).toBe(1);
      expect(result.y).toBe(0);
    });

    it('should handle very small vectors', () => {
      const result = Vector.normalize(0.0001, 0.0001);
      expect(Vector.length(result.x, result.y)).toBeCloseTo(1, FLOAT_PRECISION.STANDARD);
    });
  });

  describe('scale', () => {
    it('should scale vector by scalar', () => {
      const v: Vector2D = { x: 2, y: 3 };
      const result = Vector.scale(v, 3);
      expect(result.x).toBe(6);
      expect(result.y).toBe(9);
    });

    it('should scale by zero', () => {
      const v: Vector2D = { x: 5, y: 10 };
      const result = Vector.scale(v, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should scale by negative scalar', () => {
      const v: Vector2D = { x: 2, y: 3 };
      const result = Vector.scale(v, -2);
      expect(result.x).toBe(-4);
      expect(result.y).toBe(-6);
    });

    it('should scale by fractional scalar', () => {
      const v: Vector2D = { x: 10, y: 20 };
      const result = Vector.scale(v, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('should not modify original vector', () => {
      const v: Vector2D = { x: 2, y: 3 };
      Vector.scale(v, 3);
      expect(v.x).toBe(2);
      expect(v.y).toBe(3);
    });
  });

  describe('add', () => {
    it('should add two vectors', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 4, y: 5 };
      const result = Vector.add(v1, v2);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });

    it('should add with zero vector', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: 0, y: 0 };
      const result = Vector.add(v1, v2);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('should add negative vectors', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: -3, y: -7 };
      const result = Vector.add(v1, v2);
      expect(result.x).toBe(2);
      expect(result.y).toBe(3);
    });

    it('should not modify original vectors', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 4, y: 5 };
      Vector.add(v1, v2);
      expect(v1.x).toBe(2);
      expect(v1.y).toBe(3);
      expect(v2.x).toBe(4);
      expect(v2.y).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should subtract v2 from v1', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: 2, y: 3 };
      const result = Vector.subtract(v1, v2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(7);
    });

    it('should subtract with zero vector', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: 0, y: 0 };
      const result = Vector.subtract(v1, v2);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('should handle negative results', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 5, y: 10 };
      const result = Vector.subtract(v1, v2);
      expect(result.x).toBe(-3);
      expect(result.y).toBe(-7);
    });

    it('should not modify original vectors', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: 2, y: 3 };
      Vector.subtract(v1, v2);
      expect(v1.x).toBe(5);
      expect(v1.y).toBe(10);
      expect(v2.x).toBe(2);
      expect(v2.y).toBe(3);
    });
  });

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const v1: Vector2D = { x: 0, y: 0 };
      const v2: Vector2D = { x: 3, y: 4 };
      expect(Vector.distance(v1, v2)).toBe(5);
    });

    it('should calculate distance with same points', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: 5, y: 10 };
      expect(Vector.distance(v1, v2)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const v1: Vector2D = { x: -3, y: -4 };
      const v2: Vector2D = { x: 0, y: 0 };
      expect(Vector.distance(v1, v2)).toBe(5);
    });

    it('should be commutative', () => {
      const v1: Vector2D = { x: 1, y: 2 };
      const v2: Vector2D = { x: 4, y: 6 };
      expect(Vector.distance(v1, v2)).toBe(Vector.distance(v2, v1));
    });

    it('should handle very large distances', () => {
      const v1: Vector2D = { x: 0, y: 0 };
      const v2: Vector2D = { x: 1e10, y: 1e10 };
      const result = Vector.distance(v1, v2);
      expect(result).toBeCloseTo(1.414e10, -8);
    });
  });

  describe('dot', () => {
    it('should calculate dot product', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 4, y: 5 };
      expect(Vector.dot(v1, v2)).toBe(23); // 2*4 + 3*5 = 8 + 15 = 23
    });

    it('should handle zero vectors', () => {
      const v1: Vector2D = { x: 5, y: 10 };
      const v2: Vector2D = { x: 0, y: 0 };
      expect(Vector.dot(v1, v2)).toBe(0);
    });

    it('should handle perpendicular vectors', () => {
      const v1: Vector2D = { x: 1, y: 0 };
      const v2: Vector2D = { x: 0, y: 1 };
      expect(Vector.dot(v1, v2)).toBe(0);
    });

    it('should handle parallel vectors', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 4, y: 6 };
      expect(Vector.dot(v1, v2)).toBe(26); // 2*4 + 3*6 = 8 + 18 = 26
    });

    it('should handle opposite direction vectors', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: -2, y: -3 };
      expect(Vector.dot(v1, v2)).toBe(-13); // 2*-2 + 3*-3 = -4 + -9 = -13
    });

    it('should be commutative', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 4, y: 5 };
      expect(Vector.dot(v1, v2)).toBe(Vector.dot(v2, v1));
    });
  });
});
