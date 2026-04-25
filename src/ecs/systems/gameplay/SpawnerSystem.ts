import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { createFirefly, createMonster } from '@/entities/factories';
import { gameEvents, GameEvents } from '@/events';

const FACTORY_MAP: Record<string, (world: GameWorld, x: number, y: number) => Entity> = {
  firefly: createFirefly,
  monster: createMonster,
};

const DEFAULT_DELAY = 100;
const DEFAULT_DELAY_BETWEEN = 100;

export class SpawnerSystem implements GameSystem {
  private spawners: Query<With<Entity, 'spawner' | 'position' | 'spawnerTag'>>;

  constructor(private world: GameWorld, _config: Record<string, never>) {
    this.spawners = world.with('spawner', 'position', 'spawnerTag');
  }

  update(delta: number, _time: number): void {
    const dt = delta || 16;

    for (const entity of this.spawners) {
      this.processSpawner(entity, dt);
    }
  }

  private processSpawner(
    entity: With<Entity, 'spawner' | 'position'>,
    dt: number
  ): void {
    const { spawner, position } = entity;
    const state = spawner.state;
    const queue = spawner.queue;

    if (state.phase === 'done') return;
    if (state.currentIndex >= queue.length) {
      state.phase = 'done';
      return;
    }

    // Loop allows wait→spawn transitions within a single frame,
    // but breaks after each spawn to limit one spawn per frame per spawner.
    let remaining = dt;
    while (state.phase !== 'done') {
      const entry = queue[state.currentIndex];
      const totalSpawns = 1 + (entry.repeat ?? 0);

      switch (state.phase) {
        case 'spawning': {
          const factory = FACTORY_MAP[entry.unit];
          if (factory) {
            const spawned = factory(this.world, position.x, position.y);
            gameEvents.emit(GameEvents.ENTITY_SPAWNED, {
              entity: spawned,
              type: entry.unit,
            });
          }
          state.repeatsDone++;

          if (state.repeatsDone < totalSpawns) {
            state.phase = 'repeat_wait';
            state.timer = 0;
          } else {
            state.phase = 'entry_delay';
            state.timer = 0;
          }
          return; // one spawn per frame
        }

        case 'repeat_wait': {
          state.timer += remaining;
          remaining = 0;
          const wait = entry.delayBetween ?? DEFAULT_DELAY_BETWEEN;
          if (state.timer >= wait) {
            remaining = state.timer - wait;
            state.timer = 0;
            state.phase = 'spawning';
          } else {
            return;
          }
          break;
        }

        case 'entry_delay': {
          state.timer += remaining;
          remaining = 0;
          const delay = entry.delay ?? DEFAULT_DELAY;
          if (state.timer >= delay) {
            remaining = state.timer - delay;
            state.timer = 0;
            state.currentIndex++;
            state.repeatsDone = 0;
            if (state.currentIndex < queue.length) {
              state.phase = 'spawning';
            } else {
              state.phase = 'done';
            }
          } else {
            return;
          }
          break;
        }
      }
    }
  }
}
