import type { GameWorld } from '@/ecs/Entity';
import { GAME_CONFIG } from '@/config';
import {
  createWisp,
  createGoal,
  createSpawner,
  createRedirect
} from '@/entities/factories';

export const LEVEL_1_CONFIG = {
  initialEnergy: 200,
  store: {
    wisp: { cost: 100 }
  }
};

export const LEVEL_1_MAP: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

export function loadLevel(world: GameWorld): void {
  const TILE = GAME_CONFIG.TILE_SIZE;

  // Firefly spawner
  createSpawner(world, 1 * TILE + TILE / 2, 4 * TILE + TILE / 2, [
    { unit: 'firefly', repeat: 20, delayBetween: 500, delay: 0 },
  ]);

  // Wisps
  const wispPositions = [[4, 3], [3, 5]];
  for (const [x, y] of wispPositions) {
    createWisp(world, x * TILE + TILE / 2, y * TILE + TILE / 2);
  }

  // Monster spawner
  createSpawner(world, 17 * TILE + TILE / 2, 4 * TILE + TILE / 2, [
    { unit: 'monster', repeat: 2, delayBetween: 1000, delay: 0 },
  ]);

  // Goals
  createGoal(world, 17 * TILE + TILE / 2, 4 * TILE + TILE / 2, 'firefly');
  createGoal(world, 1 * TILE + TILE / 2, 4 * TILE + TILE / 2, 'monster');

  // Redirects — split fireflies at diamond forks
  createRedirect(world, 3 * TILE + TILE / 2, 4 * TILE + TILE / 2, [
    { x: 4 * TILE + TILE / 2, y: 3 * TILE + TILE / 2, weight: 1 },
    { x: 3 * TILE + TILE / 2, y: 6 * TILE + TILE / 2, weight: 1 },
  ], ['firefly']);

  createRedirect(world, 9 * TILE + TILE / 2, 4 * TILE + TILE / 2, [
    { x: 10 * TILE + TILE / 2, y: 3 * TILE + TILE / 2, weight: 1 },
    { x: 10 * TILE + TILE / 2, y: 6 * TILE + TILE / 2, weight: 1 },
  ], ['firefly'], TILE * 2);
}
