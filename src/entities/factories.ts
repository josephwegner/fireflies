import type { Entity, GameWorld } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';

export function createFirefly(world: GameWorld, x: number, y: number): Entity {
  const config = ENTITY_CONFIG.firefly;

  return world.add({
    position: {
      x: x + Math.random() * PHYSICS_CONFIG.POSITION_JITTER,
      y: y + Math.random() * PHYSICS_CONFIG.POSITION_JITTER
    },
    velocity: { vx: 0, vy: 0 },
    path: {
      currentPath: [],
      nextPath: [],
      direction: config.direction!
    },
    renderable: {
      type: config.type,
      sprite: config.type,
      color: config.color,
      radius: config.radius,
      alpha: 1,
      scale: 1,
      tint: 0xFFFFFF,
      rotation: 0,
      rotationSpeed: 0,
      depth: 50,
      offsetY: 0,
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
      }
    },
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    },
    interaction: {
      interactsWith: config.interactsWith!,
      interactionRadius: config.interactionRadius!
    },
    targeting: {
      potentialTargets: []
    },
    health: {
      currentHealth: config.health!,
      maxHealth: config.health!,
      isDead: false
    },
    combat: {
      state: CombatState.IDLE,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      attackPattern: config.combat!,
      hasHit: false
    },
    trail: {
      enabled: true,
      config: {
        length: 100,
        fadeTime: 800,
        color: 0xDEF4B4,
        width: 4,
        minAlpha: 0.05
      },
      points: []
    },
    fireflyTag: true
  });
}

export function createWisp(world: GameWorld, x: number, y: number): Entity {
  const config = ENTITY_CONFIG.wisp;

  return world.add({
    position: { x, y },
    destination: { for: ['firefly'] },
    renderable: {
      type: config.type,
      sprite: config.type,
      color: config.color,
      radius: config.radius,
      alpha: 1,
      scale: 1,
      tint: config.color,
      rotation: 0,
      rotationSpeed: Math.PI * 0.5,
      depth: 40,
      offsetY: 0,
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
      }
    },
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    },
    health: {
      currentHealth: 500,
      maxHealth: 500,
      isDead: false
    },
    wispTag: true,
    lodge: {
      tenants: [],
      allowedTenants: ['firefly'],
      maxTenants: 1
    },
    activationConfig: {
      onActivate: [
        {
          componentName: 'renderable',
          config: {
            tint: config.activeColor,
            glow: {
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
          }
        },
        {
          componentName: 'interaction',
          config: {
            interactsWith: ['monster'],
            interactionRadius: 112
          }
        },
        {
          componentName: 'targeting',
          config: {
            potentialTargets: []
          }
        },
        {
          componentName: 'combat',
          config: {
            state: CombatState.IDLE,
            attackPattern: config.combat!,
            hasHit: false
          }
        }
      ],
      onDeactivate: [
        {
          componentName: 'renderable',
          config: {
            tint: config.color,
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
            }
          }
        }
      ]
    }
  });
}

export function createMonster(world: GameWorld, x: number, y: number): Entity {
  const config = ENTITY_CONFIG.monster;

  return world.add({
    position: {
      x: x + Math.random() * PHYSICS_CONFIG.POSITION_JITTER,
      y: y + Math.random() * PHYSICS_CONFIG.POSITION_JITTER
    },
    velocity: { vx: 0, vy: 0 },
    path: {
      currentPath: [],
      nextPath: [],
      direction: config.direction!
    },
    renderable: {
      type: config.type,
      sprite: 'monster1',
      color: config.color,
      radius: config.radius,
      alpha: 1,
      scale: 1,
      tint: 0xFFFFFF,
      rotation: 0,
      rotationSpeed: Math.PI * 0.2,
      depth: 100,
      offsetY: 0
    },
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    },
    interaction: {
      interactsWith: config.interactsWith!,
      interactionRadius: config.interactionRadius!
    },
    targeting: {
      potentialTargets: []
    },
    health: {
      currentHealth: config.health!,
      maxHealth: config.health!,
      isDead: false
    },
    combat: {
      state: CombatState.IDLE,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      attackPattern: config.combat!,
      hasHit: false
    },
    monsterTag: true
  });
}

export function createGoal(
  world: GameWorld,
  x: number,
  y: number,
  attractType: string
): Entity {
  const config = ENTITY_CONFIG.goal;

  const spriteKey = attractType === 'monster' ? 'fireflywell' : 'greattree';
  const spriteRadius = attractType === 'monster' ? 30 : 60;

  const renderableConfig: any = {
    type: config.type,
    sprite: spriteKey,
    color: config.color,
    radius: spriteRadius,
    alpha: 1,
    scale: 1,
    tint: 0xFFFFFF,
    rotation: 0,
    rotationSpeed: 0,
    depth: 10,
    offsetY: -spriteRadius + 12
  };

  if (attractType === 'firefly') {
    renderableConfig.glow = {
      radius: 45,
      color: 0xC65D3B,
      intensity: 0.4
    };
  }

  const entity: Partial<Entity> = {
    position: { x, y },
    destination: { for: [attractType] },
    renderable: renderableConfig,
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    },
    goalTag: true
  };

  if (attractType === 'firefly') {
    entity.fireflyGoal = { currentCount: 0 };
  }

  return world.add(entity as Entity);
}
