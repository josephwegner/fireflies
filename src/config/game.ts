import { deepFreeze } from '@/utils/deepFreeze';

export const GAME_CONFIG = deepFreeze({
  // Map
  TILE_SIZE: 48,
  MAP_WIDTH: 20,
  MAP_HEIGHT: 11,

  // UI
  STORE_DRAWER_WIDTH: 80,
  STATUS_BAR_HEIGHT: 36,

  // Walls (organic forest paths - lighter outline against dark ground)
  WALL_THICKNESS: 2,
  WALL_COLOR: 0x0D270A, // Midnight blue for cohesive path edges

  // Wall Generation (Catmull-Rom smoothing)
  WALL_SMOOTHING_TENSION: 0.5,
  WALL_SMOOTHING_POINTS_PER_SEGMENT: 5,

  // Wall Blueprints
  WALL_BUILD_TIME: 2,
  WALL_BLUEPRINT_COST: 20,
  WALL_BLUEPRINT_THICKNESS: 8,
  WALL_HP: 100,
  WALL_ATTACK_RANGE: 32,

  // Store
  STORE: {
    wisp: { cost: 100 },
    wall: { cost: 20 }
  },

  // Firefly goal visual progression
  FIREFLY_GOAL_GLOW: {
    startColor: 0xC65D3B,
    endColor: 0xFFFFFF,
    minRadius: 45,
    maxRadius: 90,
    minIntensity: 0.4,
    maxIntensity: 0.8
  }
});
