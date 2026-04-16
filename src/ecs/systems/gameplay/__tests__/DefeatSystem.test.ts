import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DefeatSystem } from '../DefeatSystem';
import { gameEvents, GameEvents } from '@/events';

function createMonster(world: GameWorld, x: number, y: number): Entity {
  return world.add({
    monsterTag: true,
    position: { x, y },
    velocity: { vx: 0, vy: 0 },
    health: { currentHealth: 50, maxHealth: 50, isDead: false }
  });
}

function createMonsterGoal(world: GameWorld, x = 500, y = 500): Entity {
  return world.add({
    position: { x, y },
    destination: { forTeam: 'monster' },
    goalTag: true
  });
}

function createFireflyGoal(world: GameWorld, currentCount = 0): Entity {
  return world.add({
    goalTag: true,
    fireflyGoal: { currentCount }
  });
}

function createFirefly(world: GameWorld, x: number, y: number): Entity {
  return world.add({
    fireflyTag: true,
    position: { x, y },
    velocity: { vx: 0, vy: 0 },
    path: { currentPath: [], goalPath: [], direction: 'r' }
  });
}

describe('DefeatSystem', () => {
  let world: GameWorld;
  let system: DefeatSystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    system = new DefeatSystem(world, { firefliesToWin: 2 });
  });

  describe('monster reaches goal', () => {
    it('should emit LEVEL_LOST when a monster is near its goal', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createMonsterGoal(world, 500, 500);
      createMonster(world, 500, 500);

      system.update(16, 0);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({ reason: 'monster_reached_goal' });
    });

    it('should not emit when monster is far from goal', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createMonsterGoal(world, 500, 500);
      createMonster(world, 100, 100);

      system.update(16, 0);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should only emit once', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createMonsterGoal(world, 500, 500);
      createMonster(world, 500, 500);

      system.update(16, 0);
      system.update(16, 0);

      expect(listener).toHaveBeenCalledOnce();
    });

    it('should ignore goals that are not for monsters', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      world.add({
        position: { x: 500, y: 500 },
        destination: { forTeam: 'firefly' },
        goalTag: true
      });
      createMonster(world, 500, 500);

      system.update(16, 0);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('insufficient fireflies', () => {
    it('should emit LEVEL_LOST when all fireflies are gone but count < firefliesToWin', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createFireflyGoal(world, 1);

      gameEvents.emit(GameEvents.ALL_MONSTERS_DEFEATED, {});
      system.update(16, 0);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({ reason: 'insufficient_fireflies' });
    });

    it('should not emit while fireflies are still active', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createFireflyGoal(world, 1);
      createFirefly(world, 200, 200);

      gameEvents.emit(GameEvents.ALL_MONSTERS_DEFEATED, {});
      system.update(16, 0);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not emit before ALL_MONSTERS_DEFEATED', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createFireflyGoal(world, 0);

      system.update(16, 0);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not emit if level was already won', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createFireflyGoal(world, 2);

      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 2 });
      gameEvents.emit(GameEvents.ALL_MONSTERS_DEFEATED, {});
      system.update(16, 0);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from events on destroy', () => {
      system.destroy();

      const listener = vi.fn();
      gameEvents.on(GameEvents.LEVEL_LOST, listener);

      createFireflyGoal(world, 0);
      gameEvents.emit(GameEvents.ALL_MONSTERS_DEFEATED, {});
      system.update(16, 0);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
