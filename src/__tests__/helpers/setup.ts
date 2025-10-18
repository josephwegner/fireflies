import { World } from 'ecsy';
import {
  Combat,
  Health,
  Target,
  Position,
  Velocity,
  PhysicsBody,
  Path,
  Renderable,
  FireflyTag,
  MonsterTag,
  WispTag,
} from '@/ecs/components';
import { CombatSystem } from '@/ecs/systems/gameplay/CombatSystem';
import { AttackHandlerRegistry } from '@/ecs/systems/gameplay/attacks/AttackHandlerRegistry';
import { gameEvents } from '@/events';
import { createTestFirefly, createTestMonster } from './entities';
import { ECSEntity } from '@/types';

export interface TestSetup {
  world: World;
  combatSystem: CombatSystem;
}

export function setup(): TestSetup {
  const world = new World();

  world.registerComponent(Combat);
  world.registerComponent(Health);
  world.registerComponent(Target);
  world.registerComponent(Position);
  world.registerComponent(Velocity);
  world.registerComponent(PhysicsBody);
  world.registerComponent(Path);
  world.registerComponent(Renderable);
  world.registerComponent(FireflyTag);
  world.registerComponent(MonsterTag);
  world.registerComponent(WispTag);

  AttackHandlerRegistry.initialize();

  world.registerSystem(CombatSystem);
  const combatSystem = world.getSystem(CombatSystem) as CombatSystem;

  gameEvents.clear();

  return { world, combatSystem };
}

export interface TestEntities {
  firefly: ECSEntity;
  monster: ECSEntity;
}

export function getEntities(world: World): TestEntities {
  const firefly = createTestFirefly(world);
  const monster = createTestMonster(world);

  return { firefly, monster };
}
