import type { Team, GlowConfig } from '@/ecs/Entity';
import { deepFreeze } from '@/utils/deepFreeze';

export interface TrailVisualConfig {
  length: number;
  fadeTime: number;
  color: number;
  width: number;
  minAlpha: number;
}

export interface VisualConfig {
  sprite: string;
  depth: number;
  rotationSpeed: number;
  tint: number;
  offsetY?: number;
  spriteRadius?: number;
  collisionRadius?: number;
  glow?: GlowConfig;
  activeGlow?: GlowConfig;
  trail?: TrailVisualConfig;
}

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
  visual?: VisualConfig;
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

export const ENTITY_CONFIG: Readonly<Record<string, Readonly<EntityConfig>>> = deepFreeze({
  firefly: {
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
    visual: {
      sprite: 'firefly',
      depth: 50,
      rotationSpeed: 0,
      tint: 0xFFFFFF,
      glow: {
        radius: 22,
        color: 0xDEF4B4,
        intensity: 0.4,
        pulse: {
          enabled: true,
          speed: 0.6,
          minIntensity: 0.4,
          maxIntensity: 0.7
        }
      },
      trail: {
        length: 100,
        fadeTime: 800,
        color: 0xDEF4B4,
        width: 4,
        minAlpha: 0.05
      }
    },
    combat: {
      chargeTime: 1800,
      attackDuration: 500,
      recoveryTime: 600,
      damage: 10,
      handlerType: 'dash',
      dashSpeed: 150,
      knockbackForce: 20
    }
  },
  wisp: {
    type: 'wisp',
    team: 'firefly' as const,
    color: 0xB0C4DE,
    activeColor: 0xE8F4F8,
    radius: 18,
    mass: 1,
    isStatic: true,
    visual: {
      sprite: 'wisp',
      depth: 40,
      rotationSpeed: Math.PI * 0.5,
      tint: 0xB0C4DE,
      collisionRadius: 45,
      glow: {
        radius: 45,
        color: 0xB0C4DE,
        intensity: 0.5,
        pulse: {
          enabled: true,
          speed: 0.5,
          minIntensity: 0.3,
          maxIntensity: 0.6
        }
      },
      activeGlow: {
        radius: 30,
        color: 0x5ED6FE,
        intensity: 0.8,
        pulse: {
          enabled: true,
          speed: 1.0,
          minIntensity: 1,
          maxIntensity: 1.5
        }
      }
    },
    combat: {
      handlerType: 'pulse',
      chargeTime: 2200,
      attackDuration: 400,
      recoveryTime: 500,
      damage: 100,
      radius: 112,
      color: 0xB0C4DE
    }
  },
  monster: {
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
    visual: {
      sprite: 'monster1',
      depth: 100,
      rotationSpeed: Math.PI * 0.2,
      tint: 0xFFFFFF
    },
    combat: {
      chargeTime: 2200,
      attackDuration: 400,
      recoveryTime: 500,
      damage: 25,
      handlerType: 'pulse',
      radius: 45,
      knockbackForce: 0,
      color: 0xC65D3B
    }
  },
  goalFirefly: {
    type: 'goal',
    color: 0xC3D08B,
    radius: 15,
    mass: 1,
    isStatic: true,
    visual: {
      sprite: 'greattree',
      spriteRadius: 60,
      depth: 10,
      rotationSpeed: 0,
      tint: 0xFFFFFF,
      offsetY: -48,
      glow: {
        radius: 45,
        color: 0xC65D3B,
        intensity: 0.4
      }
    }
  },
  goalMonster: {
    type: 'goal',
    color: 0xC3D08B,
    radius: 15,
    mass: 1,
    isStatic: true,
    visual: {
      sprite: 'fireflywell',
      spriteRadius: 30,
      depth: 10,
      rotationSpeed: 0,
      tint: 0xFFFFFF,
      offsetY: -18
    }
  }
});
