import { World } from 'ecsy';
import {
  ActivationConfig,
  Position,
  Velocity,
  Renderable,
  PhysicsBody,
  Path,
  Lodge,
  Targeting,
  Destination,
  Interaction,
  Health,
  Combat,
  CombatState,
  Trail,
  FireflyGoal,
  FireflyTag,
  WispTag,
  MonsterTag,
  GoalTag
} from '@/ecs/components';
import { ECSEntity } from '@/types';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';

export function createFirefly(world: World, x: number, y: number): ECSEntity {
  const config = ENTITY_CONFIG.firefly;

  return world.createEntity()
    .addComponent(Position, {
      x: x + Math.random() * PHYSICS_CONFIG.POSITION_JITTER,
      y: y + Math.random() * PHYSICS_CONFIG.POSITION_JITTER
    })
    .addComponent(Velocity, { vx: 0, vy: 0 })
    .addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: config.direction!
    })
    .addComponent(Renderable, {
      type: config.type,
      sprite: config.type, // Use type as sprite key
      color: config.color,
      radius: config.radius,
      depth: 50, // Secondary - player units
      glow: {
        radius: 15,
        color: 0xDEF4B4, // Soft yellow-green firefly glow
        intensity: 0.4,
        pulse: {
          enabled: true,
          speed: 0.6, // Slow, gentle pulse
          minIntensity: 0.4,
          maxIntensity: 0.7
        }
      }
    })
    .addComponent(PhysicsBody, {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    })
    .addComponent(Interaction, {
      interactsWith: config.interactsWith!,
      interactionRadius: config.interactionRadius!,
      onInteract: () => {}
    })
    .addComponent(Targeting, {
      potentialTargets: []
    })
    .addComponent(Health, {
      currentHealth: config.health!,
      maxHealth: config.health!,
      isDead: false
    })
    .addComponent(Combat, {
      state: CombatState.IDLE,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      attackPattern: config.combat!,
      hasHit: false
    })
    .addComponent(Trail, {
      enabled: true,
      config: {
        length: 100,
        fadeTime: 800,
        color: 0xDEF4B4, // Soft yellow-green to match firefly glow
        width: 3,
        minAlpha: 0.05
      },
      points: []
    })
    .addComponent(FireflyTag);
}

export function createWisp(world: World, x: number, y: number): ECSEntity {
  const config = ENTITY_CONFIG.wisp;

  return world.createEntity()
    .addComponent(Position, { x, y })
    .addComponent(Destination, { for: ['firefly'] })
    .addComponent(Renderable, {
      type: config.type,
      sprite: config.type, // Use type as sprite key
      tint: config.color,
      radius: config.radius,
      depth: 40, // Secondary - towers/strategic structures
      rotationSpeed: Math.PI * 0.5, // Rotate 90 degrees per second (adjust to taste)
      glow: {
        radius: 30,
        color: 0xB0C4DE, // Pale blue tower illumination
        intensity: 0.5,
        pulse: {
          enabled: true,
          speed: 0.5, // Very slow, calm pulse
          minIntensity: 0.3,
          maxIntensity: 0.6
        }
      }
    })
    .addComponent(PhysicsBody, {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    })
    .addComponent(Health, {
      maxHealth: 500,
    })
    .addComponent(WispTag)
    .addComponent(Lodge, {
      allowedTenants: ['firefly'],
      maxTenants: 1
    })
    .addComponent(ActivationConfig, {
      onActivate: [
        {
          component: Renderable,
          config: { 
            tint: config.activeColor,
            glow: {
              radius: 20,
              color: 0x5ED6FE, // Crisp blue glow when active
              intensity: 0.8,
              pulse: {
                enabled: true,
                speed: 1.0, // Faster pulse when active
                minIntensity: 1,
                maxIntensity: 1.5
              }
            }
          }
        },
        {
          component: Interaction,
          config: {
            interactsWith: ['monster'],
            interactionRadius: 75,
            onInteract: () => {}
          }
        },
        {
          component: Targeting,
          config: {
            potentialTargets: []
          }
        },
        {
          component: Combat,
          config: {
            state: CombatState.IDLE,
            attackPattern: config.combat!,
            hasHit: false
          }
        }
      ],
      onDeactivate: [
        {
          component: Renderable,
          config: { 
            tint: config.color,
            glow: {
              radius: 30,
              color: 0xB0C4DE, // Back to pale blue when inactive
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
    });
}

export function createMonster(world: World, x: number, y: number): ECSEntity {
  const config = ENTITY_CONFIG.monster;

  return world.createEntity()
    .addComponent(Position, {
      x: x + Math.random() * PHYSICS_CONFIG.POSITION_JITTER,
      y: y + Math.random() * PHYSICS_CONFIG.POSITION_JITTER
    })
    .addComponent(Velocity, { vx: 0, vy: 0 })
    .addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: config.direction!
    })
    .addComponent(Renderable, {
      type: config.type,
      sprite: 'monster1', // Use type as sprite key
      color: config.color,
      radius: config.radius,
      rotationSpeed: Math.PI * 0.2, // Rotate 90 degrees per second (adjust to taste)
      depth: 100 // Primary - threats (highest priority)
    })
    .addComponent(PhysicsBody, {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    })
    .addComponent(Interaction, {
      interactsWith: config.interactsWith!,
      interactionRadius: config.interactionRadius!,
      onInteract: () => {}
    })
    .addComponent(Targeting, {
      potentialTargets: []
    })
    .addComponent(Health, {
      currentHealth: config.health!,
      maxHealth: config.health!,
      isDead: false
    })
    .addComponent(Combat, {
      state: CombatState.IDLE,
      attackPattern: config.combat!,
      hasHit: false
    })
    .addComponent(MonsterTag);
}

export function createGoal(
  world: World,
  x: number,
  y: number,
  attractType: string
): ECSEntity {
  const config = ENTITY_CONFIG.goal;

  // Use different sprites based on what type of entity this goal attracts
  const spriteKey = attractType === 'monster' ? 'fireflywell' : 'greattree';
  const spriteRadius = attractType === 'monster' ? 20 : 40;
  
  // Build renderable config based on attract type
  const renderableConfig: any = {
    type: config.type,
    sprite: spriteKey,
    color: config.color,
    radius: spriteRadius,
    depth: 10,
    offsetY: -spriteRadius + 8
  };

  // Only add glow for firefly goals
  if (attractType === 'firefly') {
    renderableConfig.glow = {
      radius: 30,
      color: 0xC65D3B,
      intensity: 0.4
    };
  }

  const entity = world.createEntity()
    .addComponent(Position, { x, y })
    .addComponent(Destination, { for: [attractType] })
    .addComponent(Renderable, renderableConfig)
    .addComponent(PhysicsBody, {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    })
    .addComponent(GoalTag);

  // Add FireflyGoal component for firefly goals to track progress
  if (attractType === 'firefly') {
    entity.addComponent(FireflyGoal, { currentCount: 0 });
  }

  return entity;
}
