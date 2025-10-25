export const GAME_CONFIG = Object.freeze({
  // Canvas
  WIDTH: 800,
  HEIGHT: 600,

  // Map
  TILE_SIZE: 32,
  MAP_WIDTH: 20,
  MAP_HEIGHT: 11,

  // Walls (organic forest paths - lighter outline against dark ground)
  WALL_THICKNESS: 2,
  WALL_COLOR: 0x0D270A, // Midnight blue for cohesive path edges

  // Wall Generation (Catmull-Rom smoothing)
  WALL_SMOOTHING_TENSION: 0.5,
  WALL_SMOOTHING_POINTS_PER_SEGMENT: 5
});
