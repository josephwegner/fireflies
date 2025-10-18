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
  health?: number;
  combat?: {
    chargeTime: number;
    attackDuration: number;
    recoveryTime: number;
    damage: number;
    handlerType: string; // 'dash', 'pulse', 'projectile', etc.
    dashSpeed?: number;
    radius?: number;
    knockbackForce?: number;
  };
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
    direction: 'r',
    health: 50,
    combat: Object.freeze({
      chargeTime: 1000,
      attackDuration: 300,
      recoveryTime: 400,
      damage: 10,
      handlerType: 'dash', // Instead of attackType
      dashSpeed: 100,
      knockbackForce: 50
    })
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
    direction: 'l',
    interactionRadius: 40,
    interactsWith: Object.freeze(['firefly']),
    health: 100,
    combat: Object.freeze({
      chargeTime: 1500,
      attackDuration: 100,
      recoveryTime: 0,
      damage: 25,
      handlerType: 'pulse',
      radius: 40, // Changed from pulseRadius to radius
      knockbackForce: 30
    })
  }),
  goal: Object.freeze({
    type: 'goal',
    color: 0x00ff00,
    radius: 10,
    mass: 1,
    isStatic: true
  })
});
