import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { LodgingSystem } from '../LodgingSystem';
import { SpatialGrid } from '@/utils';
import { gameEvents } from '@/events';
import { populateGridAndExecute } from '@/__tests__/helpers';

export function createLodgingTestSetup() {
  const world: GameWorld = new World<Entity>();
  const spatialGrid = new SpatialGrid(100);
  gameEvents.clear();
  const system = new LodgingSystem(world, { spatialGrid });

  function runLodging(delta: number = 16) {
    populateGridAndExecute(world, spatialGrid, system, delta);
  }

  return { world, system, spatialGrid, runLodging };
}

export type LodgingTestSetup = ReturnType<typeof createLodgingTestSetup>;
