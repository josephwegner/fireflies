export interface Vector2D {
  x: number;
  y: number;
}

export const Vector = {
  /**
   * Calculate the length/magnitude of a vector
   */
  length(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
  },

  /**
   * Normalize a vector to unit length
   */
  normalize(x: number, y: number): Vector2D {
    const len = this.length(x, y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },

  /**
   * Scale a vector by a scalar value
   */
  scale(vector: Vector2D, scalar: number): Vector2D {
    return { x: vector.x * scalar, y: vector.y * scalar };
  },

  /**
   * Add two vectors together
   */
  add(v1: Vector2D, v2: Vector2D): Vector2D {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  },

  /**
   * Subtract v2 from v1
   */
  subtract(v1: Vector2D, v2: Vector2D): Vector2D {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  },

  /**
   * Calculate distance between two points
   */
  distance(v1: Vector2D, v2: Vector2D): number {
    return this.length(v2.x - v1.x, v2.y - v1.y);
  },

  /**
   * Calculate dot product of two vectors
   */
  dot(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.x + v1.y * v2.y;
  }
};
