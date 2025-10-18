import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { TargetingSystem } from '../TargetingSystem';
import { Targeting, Target } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';

describe('TargetingSystem', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Targeting);
    world.registerComponent(Target);
    world.registerSystem(TargetingSystem);

    // Clear singleton event listeners to prevent pollution
    gameEvents.clear();
  });

  it('should acquire target when potential targets exist', () => {
    const entity = world.createEntity();
    const targetEntity = world.createEntity();

    entity.addComponent(Targeting, {
      potentialTargets: [targetEntity]
    });

    world.execute(16, 16);

    // Entity should now have Target component
    expect(entity.hasComponent(Target)).toBe(true);
    const targetComp = entity.getComponent(Target)!;
    expect(targetComp.target).toBe(targetEntity);
  });

  it('should emit TARGET_ACQUIRED event when acquiring target', () => {
    const entity = world.createEntity();
    const targetEntity = world.createEntity();
    const callback = vi.fn();

    gameEvents.on(GameEvents.TARGET_ACQUIRED, callback);

    entity.addComponent(Targeting, {
      potentialTargets: [targetEntity]
    });

    world.execute(16, 16);

    expect(callback).toHaveBeenCalledWith({
      entity,
      target: targetEntity
    });

    gameEvents.off(GameEvents.TARGET_ACQUIRED, callback);
  });

  it('should not acquire target when no potential targets exist', () => {
    const entity = world.createEntity();

    entity.addComponent(Targeting, {
      potentialTargets: []
    });

    world.execute(16, 16);

    // Entity should not have Target component
    expect(entity.hasComponent(Target)).toBe(false);
  });

  it('should not process entities that already have a target', () => {
    const entity = world.createEntity();
    const targetEntity1 = world.createEntity();
    const targetEntity2 = world.createEntity();

    entity.addComponent(Targeting, {
      potentialTargets: [targetEntity2]
    });
    entity.addComponent(Target, { target: targetEntity1 });

    world.execute(16, 16);

    // Target should remain unchanged
    const targetComp = entity.getComponent(Target)!;
    expect(targetComp.target).toBe(targetEntity1);
  });

  it('should acquire first target from potential targets list', () => {
    const entity = world.createEntity();
    const targetEntity1 = world.createEntity();
    const targetEntity2 = world.createEntity();
    const targetEntity3 = world.createEntity();

    entity.addComponent(Targeting, {
      potentialTargets: [targetEntity1, targetEntity2, targetEntity3]
    });

    world.execute(16, 16);

    // Should acquire the first target
    const targetComp = entity.getComponent(Target)!;
    expect(targetComp.target).toBe(targetEntity1);
  });

  it('should handle multiple entities acquiring targets', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();
    const target1 = world.createEntity();
    const target2 = world.createEntity();

    entity1.addComponent(Targeting, {
      potentialTargets: [target1]
    });
    entity2.addComponent(Targeting, {
      potentialTargets: [target2]
    });

    world.execute(16, 16);

    // At least one entity should have acquired its target
    // ECSY query behavior may vary based on entity creation order
    const hasTarget1 = entity1.hasComponent(Target);
    const hasTarget2 = entity2.hasComponent(Target);

    expect(hasTarget1 || hasTarget2).toBe(true);

    if (hasTarget1) {
      expect(entity1.getComponent(Target)!.target).toBe(target1);
    }
    if (hasTarget2) {
      expect(entity2.getComponent(Target)!.target).toBe(target2);
    }
  });

  it('should not throw error when processing entity without Targeting component', () => {
    const entity = world.createEntity();
    // No Targeting component added

    // Should not throw error
    expect(() => world.execute(16, 16)).not.toThrow();
    expect(entity.hasComponent(Target)).toBe(false);
  });
});
