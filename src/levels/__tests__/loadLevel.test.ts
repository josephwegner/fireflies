import { describe, it, expect, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { loadLevelFromData } from '../loadLevel';
import type { LevelData } from '../loadLevel';

vi.mock('@/entities/factories', () => ({
  createSpawner: vi.fn(),
  createGoal: vi.fn(),
  createWisp: vi.fn(),
  createRedirect: vi.fn()
}));

import { createSpawner, createGoal, createWisp, createRedirect } from '@/entities/factories';

describe('loadLevelFromData', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new World<Entity>();
    vi.clearAllMocks();
  });

  it('should call createSpawner for spawner entities', () => {
    const data: LevelData = {
      map: [[0]],
      config: { initialEnergy: 200, firefliesToWin: 2 },
      entities: [
        { type: 'spawner', x: 100, y: 200, queue: [{ unit: 'firefly', repeat: 10, delayBetween: 500 }] }
      ]
    };

    loadLevelFromData(world, data);

    expect(createSpawner).toHaveBeenCalledWith(
      world, 100, 200,
      [{ unit: 'firefly', repeat: 10, delayBetween: 500 }]
    );
  });

  it('should call createGoal for goal entities', () => {
    const data: LevelData = {
      map: [[0]],
      config: { initialEnergy: 200, firefliesToWin: 2 },
      entities: [
        { type: 'goal', x: 500, y: 300, for: 'firefly' }
      ]
    };

    loadLevelFromData(world, data);

    expect(createGoal).toHaveBeenCalledWith(world, 500, 300, 'firefly');
  });

  it('should call createWisp for wisp entities', () => {
    const data: LevelData = {
      map: [[0]],
      config: { initialEnergy: 200, firefliesToWin: 2 },
      entities: [
        { type: 'wisp', x: 200, y: 150 }
      ]
    };

    loadLevelFromData(world, data);

    expect(createWisp).toHaveBeenCalledWith(world, 200, 150);
  });

  it('should call createRedirect for redirect entities', () => {
    const data: LevelData = {
      map: [[0]],
      config: { initialEnergy: 200, firefliesToWin: 2 },
      entities: [
        {
          type: 'redirect', x: 300, y: 400, for: 'firefly',
          exits: [{ x: 350, y: 300, weight: 1 }, { x: 350, y: 500, weight: 2 }],
          radius: 144
        }
      ]
    };

    loadLevelFromData(world, data);

    expect(createRedirect).toHaveBeenCalledWith(
      world, 300, 400,
      [{ x: 350, y: 300, weight: 1 }, { x: 350, y: 500, weight: 2 }],
      ['firefly'],
      144
    );
  });

  it('should handle multiple entities of different types', () => {
    const data: LevelData = {
      map: [[0]],
      config: { initialEnergy: 200, firefliesToWin: 2 },
      entities: [
        { type: 'spawner', x: 10, y: 20, queue: [{ unit: 'firefly', repeat: 5, delayBetween: 300 }] },
        { type: 'goal', x: 50, y: 60, for: 'monster' },
        { type: 'wisp', x: 70, y: 80 },
        { type: 'redirect', x: 90, y: 100, for: 'firefly', exits: [{ x: 110, y: 90, weight: 1 }], radius: 96 }
      ]
    };

    loadLevelFromData(world, data);

    expect(createSpawner).toHaveBeenCalledTimes(1);
    expect(createGoal).toHaveBeenCalledTimes(1);
    expect(createWisp).toHaveBeenCalledTimes(1);
    expect(createRedirect).toHaveBeenCalledTimes(1);
  });

  it('should handle empty entity list', () => {
    const data: LevelData = {
      map: [[0]],
      config: { initialEnergy: 200, firefliesToWin: 2 },
      entities: []
    };

    loadLevelFromData(world, data);

    expect(createSpawner).not.toHaveBeenCalled();
    expect(createGoal).not.toHaveBeenCalled();
    expect(createWisp).not.toHaveBeenCalled();
    expect(createRedirect).not.toHaveBeenCalled();
  });
});
