import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { TargetingSystem } from '../TargetingSystem';
import { gameEvents, GameEvents } from '@/events';

describe('TargetingSystem', () => {
  let world: GameWorld;
  let system: TargetingSystem;

  beforeEach(() => {
    world = new World<Entity>();
    system = new TargetingSystem(world, {});
    gameEvents.clear();
  });

  it('should acquire target when potential targets exist', () => {
    const targetEntity = world.add({});

    const entity = world.add({
      targeting: { potentialTargets: [targetEntity] }
    });

    system.update(16, 16);

    expect(entity.target).toBeDefined();
    expect(entity.target!.target).toBe(targetEntity);
  });

  it('should emit TARGET_ACQUIRED event when acquiring target', () => {
    const targetEntity = world.add({});
    const callback = vi.fn();

    gameEvents.on(GameEvents.TARGET_ACQUIRED, callback);

    const entity = world.add({
      targeting: { potentialTargets: [targetEntity] }
    });

    system.update(16, 16);

    expect(callback).toHaveBeenCalledWith({
      entity,
      target: targetEntity
    });

    gameEvents.off(GameEvents.TARGET_ACQUIRED, callback);
  });

  it('should not acquire target when no potential targets exist', () => {
    const entity = world.add({
      targeting: { potentialTargets: [] }
    });

    system.update(16, 16);

    expect(entity.target).toBeUndefined();
  });

  it('should not process entities that already have a target', () => {
    const targetEntity1 = world.add({});
    const targetEntity2 = world.add({});

    const entity = world.add({
      targeting: { potentialTargets: [targetEntity2] },
      target: { target: targetEntity1 }
    });

    system.update(16, 16);

    expect(entity.target!.target).toBe(targetEntity1);
  });

  it('should acquire first target from potential targets list', () => {
    const targetEntity1 = world.add({});
    const targetEntity2 = world.add({});
    const targetEntity3 = world.add({});

    const entity = world.add({
      targeting: { potentialTargets: [targetEntity1, targetEntity2, targetEntity3] }
    });

    system.update(16, 16);

    expect(entity.target!.target).toBe(targetEntity1);
  });

  it('should handle multiple entities acquiring targets', () => {
    const target1 = world.add({});
    const target2 = world.add({});

    const entity1 = world.add({
      targeting: { potentialTargets: [target1] }
    });
    const entity2 = world.add({
      targeting: { potentialTargets: [target2] }
    });

    system.update(16, 16);

    const hasTarget1 = !!entity1.target;
    const hasTarget2 = !!entity2.target;

    expect(hasTarget1 || hasTarget2).toBe(true);

    if (hasTarget1) {
      expect(entity1.target!.target).toBe(target1);
    }
    if (hasTarget2) {
      expect(entity2.target!.target).toBe(target2);
    }
  });

  it('should not throw error when processing entity without Targeting component', () => {
    world.add({});

    expect(() => system.update(16, 16)).not.toThrow();
  });
});
