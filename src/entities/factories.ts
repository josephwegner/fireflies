import { World } from 'ecsy';
import {
  Position,
  Velocity,
  Renderable,
  PhysicsBody,
  Path,
  Target,
  Targeting,
  Destination,
  Interaction,
  Health,
  Combat,
  CombatState,
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
      radius: config.radius
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
      color: config.color,
      radius: config.radius
    })
    .addComponent(PhysicsBody, {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    })
    .addComponent(WispTag);
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
      sprite: config.type, // Use type as sprite key
      color: config.color,
      radius: config.radius
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
    .addComponent(MonsterTag);
}

export function createGoal(
  world: World,
  x: number,
  y: number,
  attractType: string
): ECSEntity {
  const config = ENTITY_CONFIG.goal;

  return world.createEntity()
    .addComponent(Position, { x, y })
    .addComponent(Destination, { for: [attractType] })
    .addComponent(Renderable, {
      type: config.type,
      sprite: config.type, // Use type as sprite key
      color: config.color,
      radius: config.radius
    })
    .addComponent(PhysicsBody, {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    })
    .addComponent(GoalTag);
}
