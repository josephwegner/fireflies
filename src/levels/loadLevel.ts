import type { GameWorld, SpawnEntry, Team } from '@/ecs/Entity';
import {
  createSpawner,
  createGoal,
  createWisp,
  createRedirect
} from '@/entities/factories';

export interface LevelConfig {
  initialEnergy: number;
  firefliesToWin: number;
}

export type EntityDescriptor =
  | { type: 'spawner'; x: number; y: number; queue: SpawnEntry[] }
  | { type: 'goal'; x: number; y: number; for: Team }
  | { type: 'wisp'; x: number; y: number }
  | { type: 'redirect'; x: number; y: number; for: Team; exits: { x: number; y: number; weight: number }[]; radius: number };

export interface LevelData {
  map: number[][];
  config: LevelConfig;
  entities: EntityDescriptor[];
}

export function loadLevelFromData(world: GameWorld, data: LevelData): void {
  for (const e of data.entities) {
    switch (e.type) {
      case 'spawner':  createSpawner(world, e.x, e.y, e.queue); break;
      case 'goal':     createGoal(world, e.x, e.y, e.for); break;
      case 'wisp':     createWisp(world, e.x, e.y); break;
      case 'redirect': createRedirect(world, e.x, e.y, e.exits, e.for, e.radius); break;
    }
  }
}
