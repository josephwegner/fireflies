export interface EntityConfig {
  type: string;
  color: number;
  radius: number;
  mass: number;
  isStatic: boolean;
  speed?: number;
  interactionRadius?: number;
  interactsWith?: string[];
  direction?: string;
}

export const ENTITY_CONFIG: Record<string, EntityConfig> = {
  firefly: {
    type: 'firefly',
    color: 0xffffff,
    radius: 5,
    mass: 1,
    isStatic: false,
    speed: 20,
    interactionRadius: 30,
    interactsWith: ['monster'],
    direction: 'r'
  },
  wisp: {
    type: 'wisp',
    color: 0xffffff,
    radius: 12,
    mass: 1,
    isStatic: true
  },
  monster: {
    type: 'monster',
    color: 0xff0000,
    radius: 8,
    mass: 1,
    isStatic: false,
    speed: 20,
    direction: 'l'
  },
  goal: {
    type: 'goal',
    color: 0x00ff00,
    radius: 10,
    mass: 1,
    isStatic: true
  }
};
