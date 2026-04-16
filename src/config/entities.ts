import type { Team } from '@/ecs/Entity';

export interface EntityConfig {
  type: string;
  team?: Team;
  color: number;
  activeColor?: number;
  radius: number;
  mass: number;
  isStatic: boolean;
  speed?: number;
  interactionRadius?: number;
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
    color?: number;
  };
}

export const ENTITY_CONFIG: Readonly<Record<string, Readonly<EntityConfig>>> = Object.freeze({
  firefly: Object.freeze({
    type: 'firefly',
    team: 'firefly' as const,
    color: 0xDEF4B4,
    radius: 6,
    mass: 1,
    isStatic: false,
    speed: 20,
    interactionRadius: 45,
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
    team: 'firefly' as const,
    color: 0xB0C4DE,
    activeColor: 0xE8F4F8,
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
      color: 0xB0C4DE
    })
  }),
  monster: Object.freeze({
    type: 'monster',
    team: 'monster' as const,
    color: 0xC65D3B,
    radius: 12,
    mass: 1,
    isStatic: false,
    speed: 20,
    direction: 'l',
    interactionRadius: 45,
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
