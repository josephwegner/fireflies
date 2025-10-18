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
  FireflyTag,
  WispTag,
  MonsterTag,
  GoalTag
} from '@/ecs/components';
import { ECSEntity } from '@/types';

const JITTER = 0.3;

export function createFirefly(world: World, x: number, y: number): ECSEntity {
  return world.createEntity()
    .addComponent(Position, {
      x: x + Math.random() * JITTER,
      y: y + Math.random() * JITTER
    })
    .addComponent(Velocity, { vx: 0, vy: 0 })
    .addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: 'r'
    })
    .addComponent(Renderable, {
      type: 'firefly',
      color: 0xffffff,
      radius: 5
    })
    .addComponent(PhysicsBody, {
      mass: 1,
      isStatic: false,
      collisionRadius: 5
    })
    .addComponent(Interaction, {
      interactsWith: ['monster'],
      interactionRadius: 30,
      onInteract: () => {}
    })
    .addComponent(Targeting, {
      potentialTargets: []
    })
    .addComponent(FireflyTag);
}

export function createWisp(world: World, x: number, y: number): ECSEntity {
  return world.createEntity()
    .addComponent(Position, { x, y })
    .addComponent(Destination, { for: ['firefly'] })
    .addComponent(Renderable, {
      type: 'wisp',
      color: 0xffffff,
      radius: 12
    })
    .addComponent(PhysicsBody, {
      mass: 1,
      isStatic: true,
      collisionRadius: 12
    })
    .addComponent(WispTag);
}

export function createMonster(world: World, x: number, y: number): ECSEntity {
  return world.createEntity()
    .addComponent(Position, {
      x: x + Math.random() * JITTER,
      y: y + Math.random() * JITTER
    })
    .addComponent(Velocity, { vx: 0, vy: 0 })
    .addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: 'l'
    })
    .addComponent(Renderable, {
      type: 'monster',
      color: 0xff0000,
      radius: 8
    })
    .addComponent(PhysicsBody, {
      mass: 1,
      isStatic: false,
      collisionRadius: 8
    })
    .addComponent(MonsterTag);
}

export function createGoal(
  world: World,
  x: number,
  y: number,
  attractType: string
): ECSEntity {
  return world.createEntity()
    .addComponent(Position, { x, y })
    .addComponent(Destination, { for: [attractType] })
    .addComponent(Renderable, {
      type: 'goal',
      color: 0x00ff00,
      radius: 10
    })
    .addComponent(PhysicsBody, {
      mass: 1,
      isStatic: true,
      collisionRadius: 10
    })
    .addComponent(GoalTag);
}
