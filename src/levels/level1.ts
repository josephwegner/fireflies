import type { GameWorld } from '@/ecs/Entity';
import { GAME_CONFIG } from '@/config';
import {
  createFirefly,
  createWisp,
  createMonster,
  createGoal
} from '@/entities/factories';

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

  // Fireflies
  const fireflyPositions = [
    [2, 3], [6, 2], [1, 6], [1, 5], [1, 4], [1, 3]
  ];
  for (const [x, y] of fireflyPositions) {
    createFirefly(world, x * TILE + TILE / 2, y * TILE + TILE / 2);
  }

  // Wisps
  const wispPositions = [[4, 3], [3, 5]];
  for (const [x, y] of wispPositions) {
    createWisp(world, x * TILE + TILE / 2, y * TILE + TILE / 2);
  }

  // Monsters
  const monsterPositions = [[13, 7], [11, 3], [17, 4]];
  for (const [x, y] of monsterPositions) {
    createMonster(world, x * TILE + TILE / 2, y * TILE + TILE / 2);
  }

  // Goals
  createGoal(world, 17 * TILE + TILE / 2, 4 * TILE + TILE / 2, 'firefly');
  createGoal(world, 1 * TILE + TILE / 2, 4 * TILE + TILE / 2, 'monster');
}
