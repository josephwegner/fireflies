export const COLORS = {
  // Foundation Colors (Dark Forest)
  DEEP_CHARCOAL_1: 0x0A1824,
  DEEP_CHARCOAL_2: 0x092409,
  MIDNIGHT_BLUE_1: 0x0F2A38,
  MIDNIGHT_BLUE_2: 0x1D3C43,
  DARK_FOREST_GREEN_1: 0x2A4930,
  DARK_FOREST_GREEN_2: 0x132F13,
  
  // Accent Colors (Light Sources)
  FIREFLY_GLOW_BRIGHT: 0xDEF4B4,
  FIREFLY_GLOW_SOFT: 0xC3D08B,
  TOWER_ILLUMINATION_BLUE: 0xB0C4DE,
  TOWER_ILLUMINATION_WHITE: 0xE8F4F8,
  MONSTER_PRESENCE: 0xC65D3B,
  
  // Legacy colors for backward compatibility
  RED: 0xff0000,
  GREEN: 0x00ff00,
  BLUE: 0x0000ff,
  YELLOW: 0xffff00,
  PURPLE: 0x800080,
  GREY: 0x808080,
  WHITE: 0xffffff
} as const;

export type Color = typeof COLORS[keyof typeof COLORS];
