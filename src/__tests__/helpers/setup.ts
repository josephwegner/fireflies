import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { CombatSystem } from '@/ecs/systems/gameplay/CombatSystem';
import { gameEvents } from '@/events';
import { createTestFirefly, createTestMonster } from './entities';
import { SpatialGrid } from '@/utils';

export interface TestSetup {
  world: GameWorld;
  combatSystem: CombatSystem;
  spatialGrid: SpatialGrid;
}

export function setup(): TestSetup {
  const world = new World<Entity>();

  const spatialGrid = new SpatialGrid(100);
  const combatSystem = new CombatSystem(world, { spatialGrid });

  gameEvents.clear();

  return { world, combatSystem, spatialGrid };
}

export function executeWithSpatialGrid(world: GameWorld, spatialGrid: SpatialGrid, delta: number = 16): void {
  spatialGrid.clear();
  const positioned = world.with('position');
  for (const entity of positioned) {
    spatialGrid.insert(entity, entity.position.x, entity.position.y);
  }
}

export interface TestEntities {
  firefly: Entity;
  monster: Entity;
}

export function getEntities(world: GameWorld): TestEntities {
  const firefly = createTestFirefly(world);
  const monster = createTestMonster(world);
  return { firefly, monster };
}
