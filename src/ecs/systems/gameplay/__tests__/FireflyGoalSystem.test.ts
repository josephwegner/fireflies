import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { FireflyGoalSystem } from '../FireflyGoalSystem';
import { gameEvents, GameEvents } from '@/events';

function createFireflyGoal(world: GameWorld, x = 500, y = 500): Entity {
  return world.add({
    position: { x, y },
    goalTag: true,
    fireflyGoal: { currentCount: 0 },
    renderable: {
      type: 'greattree', sprite: 'greattree', color: 0xffffff, radius: 60,
      alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0,
      depth: 50, offsetY: 0,
      glow: { color: 0xC65D3B, radius: 45, intensity: 0.4 }
    }
  });
}

function createFirefly(world: GameWorld, x: number, y: number): Entity {
  return world.add({
    fireflyTag: true,
    position: { x, y },
    velocity: { vx: 0, vy: 0 },
    path: { currentPath: [], goalPath: [], direction: 'r' },
    destination: { forTeam: 'firefly' },
    renderable: {
      type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 4,
      alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0,
      depth: 50, offsetY: 0
    }
  });
}

describe('FireflyGoalSystem', () => {
  let world: GameWorld;
  let system: FireflyGoalSystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    system = new FireflyGoalSystem(world, { firefliesToWin: 2 });
  });

  it('should collect a firefly that reaches the goal', () => {
    const goal = createFireflyGoal(world);
    createFirefly(world, 500, 500);

    system.update(16, 0);

    expect(goal.fireflyGoal!.currentCount).toBe(1);
  });

  it('should not collect a firefly far from the goal', () => {
    const goal = createFireflyGoal(world);
    createFirefly(world, 100, 100);

    system.update(16, 0);

    expect(goal.fireflyGoal!.currentCount).toBe(0);
  });

  it('should emit LEVEL_WON when firefliesToWin threshold is met', () => {
    const listener = vi.fn();
    gameEvents.on(GameEvents.LEVEL_WON, listener);

    createFireflyGoal(world);
    createFirefly(world, 500, 500);
    createFirefly(world, 501, 500);

    system.update(16, 0);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ firefliesCollected: 2 });
  });

  it('should not emit LEVEL_WON before threshold is met', () => {
    const listener = vi.fn();
    gameEvents.on(GameEvents.LEVEL_WON, listener);

    createFireflyGoal(world);
    createFirefly(world, 500, 500);

    system.update(16, 0);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should only emit LEVEL_WON once', () => {
    const listener = vi.fn();
    gameEvents.on(GameEvents.LEVEL_WON, listener);

    createFireflyGoal(world);
    createFirefly(world, 500, 500);
    createFirefly(world, 501, 500);
    createFirefly(world, 502, 500);

    system.update(16, 0);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('should remove destination, path, and renderable from collected firefly', () => {
    createFireflyGoal(world);
    const firefly = createFirefly(world, 500, 500);

    system.update(16, 0);

    expect(firefly.destination).toBeUndefined();
    expect(firefly.path).toBeUndefined();
    expect(firefly.renderable).toBeUndefined();
  });

  it('should collect firefly via PATH_COMPLETED event when near goal', () => {
    const goal = createFireflyGoal(world);
    const firefly = createFirefly(world, 100, 100);

    gameEvents.emit(GameEvents.PATH_COMPLETED, {
      entity: firefly,
      position: { x: 500, y: 500 }
    });

    expect(goal.fireflyGoal!.currentCount).toBe(1);
  });

  it('should use firefliesToWin from config', () => {
    gameEvents.clear();
    const system5 = new FireflyGoalSystem(world, { firefliesToWin: 5 });

    const listener = vi.fn();
    gameEvents.on(GameEvents.LEVEL_WON, listener);

    createFireflyGoal(world);
    for (let i = 0; i < 4; i++) {
      createFirefly(world, 500 + i, 500);
    }
    system5.update(16, 0);
    expect(listener).not.toHaveBeenCalled();

    createFirefly(world, 504, 500);
    system5.update(16, 0);
    expect(listener).toHaveBeenCalledOnce();

    system5.destroy();
  });

  it('should clean up event listener on destroy', () => {
    system.destroy();

    const goal = createFireflyGoal(world);
    const firefly = createFirefly(world, 100, 100);

    gameEvents.emit(GameEvents.PATH_COMPLETED, {
      entity: firefly,
      position: { x: 500, y: 500 }
    });

    expect(goal.fireflyGoal!.currentCount).toBe(0);
  });
});
