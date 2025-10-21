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
      chargeTime: 1800,      // Increased from 1000ms for dramatic charge-up
      attackDuration: 500,   // Increased from 300ms for more visible dash
      recoveryTime: 600,     // Increased from 400ms for recovery drift
      damage: 10,
      handlerType: 'dash',
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
      chargeTime: 2200,      // Increased from 1500ms for slow, menacing charge
      attackDuration: 400,   // Increased from 100ms for visible pulse expansion
      recoveryTime: 500,     // Increased from 0ms for brief pause after attack
      damage: 25,
      handlerType: 'pulse',
      radius: 40,
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
