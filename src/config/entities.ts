export interface EntityConfig {
  type: string;
  color: number;
  radius: number;
  mass: number;
  isStatic: boolean;
  speed?: number;
  interactionRadius?: number;
  interactsWith?: readonly string[];
  direction?: string;
}

export const ENTITY_CONFIG: Readonly<Record<string, Readonly<EntityConfig>>> = Object.freeze({
  firefly: Object.freeze({
    type: 'firefly',
    color: 0xffffff,
    radius: 5,
    mass: 1,
    isStatic: false,
    speed: 20,
    interactionRadius: 30,
    interactsWith: Object.freeze(['monster']),
    direction: 'r'
  }),
  wisp: Object.freeze({
    type: 'wisp',
    color: 0xffffff,
    radius: 12,
    mass: 1,
    isStatic: true
  }),
  monster: Object.freeze({
    type: 'monster',
    color: 0xff0000,
    radius: 8,
    mass: 1,
    isStatic: false,
    speed: 20,
    direction: 'l'
  }),
  goal: Object.freeze({
    type: 'goal',
    color: 0x00ff00,
    radius: 10,
    mass: 1,
    isStatic: true
  })
});
