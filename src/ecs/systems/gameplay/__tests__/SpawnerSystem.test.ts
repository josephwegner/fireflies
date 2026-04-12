import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { SpawnerSystem } from '../SpawnerSystem';
import { gameEvents, GameEvents } from '@/events';
import { createTestSpawner } from '@/__tests__/helpers';

describe('SpawnerSystem', () => {
  let world: GameWorld;
  let system: SpawnerSystem;

  beforeEach(() => {
    world = new World<Entity>();
    system = new SpawnerSystem(world, {});
    gameEvents.clear();
  });

  function countEntitiesByTag(tag: 'fireflyTag' | 'monsterTag'): number {
    return world.with(tag).entities.length;
  }

  describe('Single spawn (no repeat)', () => {
    it('should spawn one unit on first update', () => {
      createTestSpawner(world, {
        queue: [{ unit: 'firefly' }]
      });

      system.update(16, 0);

      expect(countEntitiesByTag('fireflyTag')).toBe(1);
    });

    it('should spawn a monster when unit is monster', () => {
      createTestSpawner(world, {
        queue: [{ unit: 'monster' }]
      });

      system.update(16, 0);

      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });

    it('should transition to entry_delay after spawning', () => {
      const spawner = createTestSpawner(world, {
        queue: [{ unit: 'firefly', delay: 200 }]
      });

      system.update(16, 0);

      expect(spawner.spawner!.state.phase).toBe('entry_delay');
    });

    it('should transition to done after delay when no more entries', () => {
      const spawner = createTestSpawner(world, {
        queue: [{ unit: 'firefly', delay: 50 }]
      });

      system.update(16, 0);   // spawns, enters entry_delay
      system.update(50, 0);   // delay elapsed

      expect(spawner.spawner!.state.phase).toBe('done');
    });

    it('should not spawn additional units after done', () => {
      createTestSpawner(world, {
        queue: [{ unit: 'firefly', delay: 0 }]
      });

      system.update(16, 0);   // spawns
      system.update(16, 0);   // delay passes (0ms), done
      system.update(16, 0);   // should not spawn more

      expect(countEntitiesByTag('fireflyTag')).toBe(1);
    });
  });

  describe('Repeat spawns', () => {
    it('should spawn 1 + repeat units total', () => {
      createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 2, delayBetween: 10 }]
      });

      // First spawn (immediate)
      system.update(16, 0);
      expect(countEntitiesByTag('fireflyTag')).toBe(1);

      // Wait for delayBetween, second spawn
      system.update(10, 0);
      expect(countEntitiesByTag('fireflyTag')).toBe(2);

      // Wait for delayBetween, third spawn
      system.update(10, 0);
      expect(countEntitiesByTag('fireflyTag')).toBe(3);
    });

    it('should enter repeat_wait between spawns', () => {
      const spawner = createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 1, delayBetween: 100 }]
      });

      system.update(16, 0);

      expect(spawner.spawner!.state.phase).toBe('repeat_wait');
    });

    it('should not spawn during repeat_wait', () => {
      createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 1, delayBetween: 100 }]
      });

      system.update(16, 0);   // first spawn
      system.update(50, 0);   // half of delayBetween

      expect(countEntitiesByTag('fireflyTag')).toBe(1);
    });

    it('should use default delayBetween of 100 when not specified', () => {
      const spawner = createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 1 }]
      });

      system.update(16, 0);   // first spawn
      system.update(99, 0);   // not yet
      expect(countEntitiesByTag('fireflyTag')).toBe(1);

      system.update(1, 0);    // 100ms total, should spawn
      expect(countEntitiesByTag('fireflyTag')).toBe(2);
    });

    it('should transition to entry_delay after all repeats done', () => {
      const spawner = createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 1, delayBetween: 10, delay: 200 }]
      });

      system.update(16, 0);   // first spawn
      system.update(10, 0);   // second spawn (repeat done)

      expect(spawner.spawner!.state.phase).toBe('entry_delay');
    });
  });

  describe('Entry delay', () => {
    it('should wait delay ms before advancing to next entry', () => {
      createTestSpawner(world, {
        queue: [
          { unit: 'firefly', delay: 200 },
          { unit: 'monster' }
        ]
      });

      system.update(16, 0);   // spawn firefly, enter entry_delay
      system.update(100, 0);  // half delay
      expect(countEntitiesByTag('monsterTag')).toBe(0);

      system.update(100, 0);  // delay elapsed, should spawn monster
      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });

    it('should use default delay of 100 when not specified', () => {
      createTestSpawner(world, {
        queue: [
          { unit: 'firefly' },
          { unit: 'monster' }
        ]
      });

      system.update(16, 0);   // spawn firefly
      system.update(99, 0);   // not enough delay
      expect(countEntitiesByTag('monsterTag')).toBe(0);

      system.update(1, 0);    // 100ms total
      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });
  });

  describe('Multi-entry sequence', () => {
    it('should process entries in order', () => {
      createTestSpawner(world, {
        queue: [
          { unit: 'firefly', delay: 50 },
          { unit: 'firefly', delay: 50 },
          { unit: 'monster', delay: 50 }
        ]
      });

      system.update(16, 0);   // spawn first firefly
      expect(countEntitiesByTag('fireflyTag')).toBe(1);

      system.update(50, 0);   // delay, spawn second firefly
      expect(countEntitiesByTag('fireflyTag')).toBe(2);

      system.update(50, 0);   // delay, spawn monster
      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });

    it('should handle repeat entry followed by non-repeat entry', () => {
      createTestSpawner(world, {
        queue: [
          { unit: 'firefly', repeat: 1, delayBetween: 20, delay: 50 },
          { unit: 'monster' }
        ]
      });

      system.update(16, 0);   // first firefly
      system.update(20, 0);   // repeat firefly
      expect(countEntitiesByTag('fireflyTag')).toBe(2);

      system.update(50, 0);   // entry delay, then monster
      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });
  });

  describe('Empty queue', () => {
    it('should immediately be in done state', () => {
      const spawner = createTestSpawner(world, { queue: [] });

      expect(spawner.spawner!.state.phase).toBe('done');
    });

    it('should not spawn anything on update', () => {
      createTestSpawner(world, { queue: [] });

      system.update(16, 0);
      system.update(16, 0);

      expect(countEntitiesByTag('fireflyTag')).toBe(0);
      expect(countEntitiesByTag('monsterTag')).toBe(0);
    });
  });

  describe('ENTITY_SPAWNED event', () => {
    it('should emit ENTITY_SPAWNED for each spawned entity', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ENTITY_SPAWNED, listener);

      createTestSpawner(world, {
        queue: [{ unit: 'firefly' }]
      });

      system.update(16, 0);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({
        entity: expect.objectContaining({ fireflyTag: true }),
        type: 'firefly'
      });
    });

    it('should emit correct type for monsters', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ENTITY_SPAWNED, listener);

      createTestSpawner(world, {
        queue: [{ unit: 'monster' }]
      });

      system.update(16, 0);

      expect(listener).toHaveBeenCalledWith({
        entity: expect.objectContaining({ monsterTag: true }),
        type: 'monster'
      });
    });

    it('should emit event for each repeat spawn', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ENTITY_SPAWNED, listener);

      createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 2, delayBetween: 10 }]
      });

      system.update(16, 0);  // first
      system.update(10, 0);  // second
      system.update(10, 0);  // third

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe('Spawn position', () => {
    it('should spawn entities near the spawner position', () => {
      createTestSpawner(world, {
        x: 300, y: 400,
        queue: [{ unit: 'firefly' }]
      });

      system.update(16, 0);

      const firefly = world.with('fireflyTag').first!;
      // Factory adds jitter, so position should be near but not exact
      expect(firefly.position!.x).toBeGreaterThanOrEqual(300);
      expect(firefly.position!.y).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Multiple spawners', () => {
    it('should process all spawners independently', () => {
      createTestSpawner(world, {
        x: 100, y: 100,
        queue: [{ unit: 'firefly' }]
      });
      createTestSpawner(world, {
        x: 400, y: 400,
        queue: [{ unit: 'monster' }]
      });

      system.update(16, 0);

      expect(countEntitiesByTag('fireflyTag')).toBe(1);
      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });
  });

  describe('Timer accuracy', () => {
    it('should carry over excess time from repeat_wait', () => {
      createTestSpawner(world, {
        queue: [{ unit: 'firefly', repeat: 1, delayBetween: 50 }]
      });

      system.update(16, 0);   // first spawn
      system.update(70, 0);   // 70 > 50, should spawn + carry 20ms

      expect(countEntitiesByTag('fireflyTag')).toBe(2);
    });

    it('should carry over excess time from entry_delay', () => {
      const spawner = createTestSpawner(world, {
        queue: [
          { unit: 'firefly', delay: 50 },
          { unit: 'monster', delay: 50 }
        ]
      });

      system.update(16, 0);   // spawn firefly
      system.update(80, 0);   // 80 > 50 delay, should spawn monster + carry 30ms

      expect(countEntitiesByTag('monsterTag')).toBe(1);
    });
  });
});
