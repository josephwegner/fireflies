/**
 * Test constants for consistent values across test suites
 */

export const TEST_POSITIONS = {
  FIREFLY_DEFAULT: { x: 100, y: 100 },
  WISP_DEFAULT: { x: 300, y: 300 },
  MONSTER_DEFAULT: { x: 200, y: 200 },
  GOAL_DEFAULT: { x: 500, y: 500 },
  ORIGIN: { x: 0, y: 0 }
} as const;

export const TEST_ENTITY_DEFAULTS = {
  RADIUS: 5,
  DIRECTION: 'r' as const,
  SPEED: 100
} as const;

export const TEST_TIMING = {
  DELTA_16MS: 16,
  DELTA_32MS: 32,
  DELTA_100MS: 100,
  TIME_START: 0,
  TIME_16MS: 16,
  TIME_100MS: 100
} as const;

/**
 * Floating point precision constants
 *
 * Use these when comparing floating point numbers with toBeCloseTo()
 * to ensure consistent precision across all tests.
 */
export const FLOAT_PRECISION = {
  /** Standard precision for most calculations (5 decimal places) */
  STANDARD: 5,
  /** High precision for critical calculations (8 decimal places) */
  HIGH: 8,
  /** Low precision for approximate comparisons (2 decimal places) */
  LOW: 2
} as const;
