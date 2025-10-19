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
import { SpatialGrid } from '@/utils';

export interface TestSetup {
  world: World;
  combatSystem: CombatSystem;
  spatialGrid: SpatialGrid;
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

  // Create spatial grid and pass to CombatSystem
  const spatialGrid = new SpatialGrid(100);
  world.registerSystem(CombatSystem, { spatialGrid });
  const combatSystem = world.getSystem(CombatSystem) as CombatSystem;

  gameEvents.clear();

  return { world, combatSystem, spatialGrid };
}

// Helper to populate spatial grid and execute world
export function executeWithSpatialGrid(world: World, spatialGrid: SpatialGrid, delta: number = 16): void {
  spatialGrid.clear();
  const positionedEntities = (world.entityManager as any)._entities.filter(
    (e: any) => e.hasComponent(Position)
  );
  positionedEntities.forEach((entity: any) => {
    const pos = entity.getComponent(Position);
    if (pos) {
      spatialGrid.insert(entity, pos.x, pos.y);
    }
  });
  world.execute(delta, delta);
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
