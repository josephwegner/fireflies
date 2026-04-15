export interface EntityConfig {
  type: string;
  color: number;
  activeColor?: number; // Color when entity is activated (e.g., wisp with firefly)
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
    handlerType: 'dash' | 'pulse';
    dashSpeed?: number;
    radius?: number;
    knockbackForce?: number;
    color?: number; // Color for visual effects
  };
}

export const ENTITY_CONFIG: Readonly<Record<string, Readonly<EntityConfig>>> = Object.freeze({
  firefly: Object.freeze({
    type: 'firefly',
    color: 0xDEF4B4, // Firefly glow bright
    radius: 6,
    mass: 1,
    isStatic: false,
    speed: 20,
    interactionRadius: 45,
    interactsWith: Object.freeze(['monster']),
    direction: 'r',
    health: 50,
    combat: Object.freeze({
      chargeTime: 1800,
      attackDuration: 500,
      recoveryTime: 600,
      damage: 10,
      handlerType: 'dash',
      dashSpeed: 150,
      knockbackForce: 20
    })
  }),
  wisp: Object.freeze({
    type: 'wisp',
    color: 0xB0C4DE, // Tower illumination blue (inactive)
    activeColor: 0xE8F4F8, // Tower illumination white (active)
    radius: 18,
    mass: 1,
    isStatic: true,
    combat: Object.freeze({
      handlerType: 'pulse',
      chargeTime: 2200,
      attackDuration: 400,
      recoveryTime: 500,
      damage: 100,
      radius: 112,
      targetTags: ['monster'],
      color: 0xB0C4DE
    })
  }),
  monster: Object.freeze({
    type: 'monster',
    color: 0xC65D3B, // Monster presence red
    radius: 12,
    mass: 1,
    isStatic: false,
    speed: 20,
    direction: 'l',
    interactionRadius: 45,
    interactsWith: Object.freeze(['firefly', 'wisp']),
    health: 50,
    combat: Object.freeze({
      chargeTime: 2200,
      attackDuration: 400,
      recoveryTime: 500,
      damage: 25,
      handlerType: 'pulse',
      radius: 45,
      knockbackForce: 0,
      color: 0xC65D3B
    })
  }),
  goal: Object.freeze({
    type: 'goal',
    color: 0xC3D08B, // Firefly glow soft (subtle goal marker)
    radius: 15,
    mass: 1,
    isStatic: true
  })
});
