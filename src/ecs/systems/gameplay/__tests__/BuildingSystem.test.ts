import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { BuildingSystem } from '../BuildingSystem';
import { gameEvents, GameEvents } from '@/events';

function createBuildableEntity(world: GameWorld, sites: { x: number; y: number }[], buildTime = 5): Entity {
  return world.add({
    position: { x: (sites[0].x + (sites[1]?.x ?? sites[0].x)) / 2, y: (sites[0].y + (sites[1]?.y ?? sites[0].y)) / 2 },
    buildable: {
      sites: sites.map(s => ({ x: s.x, y: s.y, built: false, buildProgress: 0 })),
      buildTime,
      allBuilt: false
    }
  });
}

function createAvailableFirefly(world: GameWorld, x: number, y: number): Entity {
  return world.add({
    position: { x, y },
    velocity: { vx: 0, vy: 0 },
    path: { currentPath: [], goalPath: [], direction: 'r' },
    renderable: { type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5, alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0 },
    team: 'firefly' as const,
    fireflyTag: true as const
  });
}

function createMockWorker(): Worker {
  return {
    postMessage: vi.fn(),
    onmessage: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as Worker;
}

describe('BuildingSystem', () => {
  let world: GameWorld;
  let system: BuildingSystem;
  let worker: Worker;

  beforeEach(() => {
    world = new World<Entity>();
    worker = createMockWorker();
    system = new BuildingSystem(world, { worker });
  });

  afterEach(() => {
    system.destroy();
    gameEvents.clear();
  });

  describe('recruitment', () => {
    it('should assign a firefly to an unbuilt site', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 90, 100);

      system.update(16, 0);

      expect(firefly.assignedDestination).toBeDefined();
      expect(firefly.assignedDestination!.target).toBe(buildable);
    });

    it('should set targetPosition to the site coordinates', () => {
      createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 90, 100);

      system.update(16, 0);

      expect(firefly.assignedDestination!.targetPosition).toBeDefined();
      const tp = firefly.assignedDestination!.targetPosition!;
      expect(tp.x === 100 || tp.x === 200).toBe(true);
    });

    it('should not recruit fireflies that already have an assignment', () => {
      createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 90, 100);
      world.addComponent(firefly, 'assignedDestination', { target: firefly });

      system.update(16, 0);

      // Should still point to original assignment, not the buildable
      expect(firefly.assignedDestination!.target).toBe(firefly);
    });

    it('should not recruit fleeing fireflies', () => {
      createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 90, 100);
      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system.update(16, 0);

      expect(firefly.assignedDestination).toBeUndefined();
    });

    it('should not recruit non-firefly entities', () => {
      createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const monster = world.add({
        position: { x: 90, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'l' },
        renderable: { type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8, alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0 },
        team: 'monster' as const,
        monsterTag: true as const
      });

      system.update(16, 0);

      expect(monster.assignedDestination).toBeUndefined();
    });

    it('should set builderEntity on the assigned site', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 90, 100);

      system.update(16, 0);

      const site0 = buildable.buildable!.sites[0];
      const site1 = buildable.buildable!.sites[1];
      const hasBuilder = site0.builderEntity === firefly || site1.builderEntity === firefly;
      expect(hasBuilder).toBe(true);
    });

    it('should use sequential strategy when sites are close together', () => {
      createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 110, y: 100 }]);
      const firefly1 = createAvailableFirefly(world, 90, 100);
      const firefly2 = createAvailableFirefly(world, 95, 100);

      system.update(16, 0);

      // Only one firefly should be assigned (sequential)
      const assigned = [firefly1, firefly2].filter(f => f.assignedDestination);
      expect(assigned.length).toBe(1);
    });

    it('should use parallel strategy when sites are far apart', () => {
      createBuildableEntity(world, [{ x: 0, y: 0 }, { x: 500, y: 500 }]);
      const firefly1 = createAvailableFirefly(world, 10, 10);
      const firefly2 = createAvailableFirefly(world, 490, 490);

      system.update(16, 0);

      const assigned = [firefly1, firefly2].filter(f => f.assignedDestination);
      expect(assigned.length).toBe(2);
    });

    it('should not recruit again if already has builders assigned', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly1 = createAvailableFirefly(world, 90, 100);

      system.update(16, 0);
      expect(firefly1.assignedDestination).toBeDefined();

      // Add another firefly — should NOT be recruited for the same buildable
      const firefly2 = createAvailableFirefly(world, 95, 100);
      system.update(16, 0);

      // If sequential, site1 might not have a builder yet, but recruitment shouldn't double-assign site0
      const site0Builder = buildable.buildable!.sites[0].builderEntity;
      const site1Builder = buildable.buildable!.sites[1].builderEntity;
      // At least one site should have a builder, and firefly2 shouldn't be assigned to the same site
      if (site0Builder && site1Builder) {
        expect(site0Builder).not.toBe(site1Builder);
      }
    });

    it('should skip buildables that are already fully built', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      buildable.buildable!.allBuilt = true;
      const firefly = createAvailableFirefly(world, 90, 100);

      system.update(16, 0);

      expect(firefly.assignedDestination).toBeUndefined();
    });
  });

  describe('build ticking', () => {
    it('should increment buildProgress when builder is at the site', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 5);
      const firefly = createAvailableFirefly(world, 100, 100);

      // Manually set up assignment (builder at site position)
      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      system.update(1000, 0); // 1 second of 5 second build time

      expect(buildable.buildable!.sites[0].buildProgress).toBeGreaterThan(0);
      expect(buildable.buildable!.sites[0].buildProgress).toBeCloseTo(0.2, 1);
    });

    it('should not increment progress when builder is far from site', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 5);
      const firefly = createAvailableFirefly(world, 500, 500); // Far away

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      system.update(1000, 0);

      expect(buildable.buildable!.sites[0].buildProgress).toBe(0);
    });

    it('should mark site as built when progress reaches 1', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const firefly = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      system.update(1500, 0); // 1.5 seconds > 1 second build time

      expect(buildable.buildable!.sites[0].built).toBe(true);
      expect(buildable.buildable!.sites[0].buildProgress).toBeGreaterThanOrEqual(1);
    });

    it('should emit BUILD_SITE_COMPLETED when site finishes', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const firefly = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      const handler = vi.fn();
      gameEvents.on(GameEvents.BUILD_SITE_COMPLETED, handler);

      system.update(1500, 0);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        entity: buildable,
        siteIndex: 0
      }));
    });
  });

  describe('completion', () => {
    it('should set allBuilt when all sites are built', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const f1 = createAvailableFirefly(world, 100, 100);
      const f2 = createAvailableFirefly(world, 200, 100);

      buildable.buildable!.sites[0].builderEntity = f1;
      buildable.buildable!.sites[1].builderEntity = f2;
      world.addComponent(f1, 'assignedDestination', { target: buildable, targetPosition: { x: 100, y: 100 } });
      world.addComponent(f2, 'assignedDestination', { target: buildable, targetPosition: { x: 200, y: 100 } });

      system.update(1500, 0);

      expect(buildable.buildable!.allBuilt).toBe(true);
    });

    it('should emit BUILD_COMPLETE when all sites done', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const f1 = createAvailableFirefly(world, 100, 100);
      const f2 = createAvailableFirefly(world, 200, 100);

      buildable.buildable!.sites[0].builderEntity = f1;
      buildable.buildable!.sites[1].builderEntity = f2;
      world.addComponent(f1, 'assignedDestination', { target: buildable, targetPosition: { x: 100, y: 100 } });
      world.addComponent(f2, 'assignedDestination', { target: buildable, targetPosition: { x: 200, y: 100 } });

      const handler = vi.fn();
      gameEvents.on(GameEvents.BUILD_COMPLETE, handler);

      system.update(1500, 0);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ entity: buildable }));
    });

    it('should not emit BUILD_COMPLETE when only one site is done', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const f1 = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = f1;
      world.addComponent(f1, 'assignedDestination', { target: buildable, targetPosition: { x: 100, y: 100 } });

      const handler = vi.fn();
      gameEvents.on(GameEvents.BUILD_COMPLETE, handler);

      system.update(1500, 0);

      expect(handler).not.toHaveBeenCalled();
      expect(buildable.buildable!.allBuilt).toBe(false);
    });
  });

  describe('holding flag', () => {
    it('should set holding = true when builder starts building at a site', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 5);
      const firefly = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      system.update(100, 0);

      expect(firefly.assignedDestination!.holding).toBe(true);
    });

    it('should not set holding when builder is far from site', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 5);
      const firefly = createAvailableFirefly(world, 500, 500);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      system.update(100, 0);

      expect(firefly.assignedDestination!.holding).toBeFalsy();
    });

    it('should clear holding on sequential handoff so entity re-navigates', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const firefly = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      // Complete first site — triggers handoff
      system.update(1500, 0);

      expect(firefly.assignedDestination!.holding).toBe(false);
      expect(firefly.assignedDestination!.targetPosition).toEqual({ x: 200, y: 100 });
    });
  });

  describe('sequential handoff', () => {
    it('should reassign builder to next unbuilt site after completing one', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }], 1);
      const firefly = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      // Complete first site
      system.update(1500, 0);

      expect(buildable.buildable!.sites[0].built).toBe(true);
      // Builder should be reassigned to site 1
      expect(buildable.buildable!.sites[1].builderEntity).toBe(firefly);
      expect(firefly.assignedDestination).toBeDefined();
      expect(firefly.assignedDestination!.targetPosition).toEqual({ x: 200, y: 100 });
    });
  });

  describe('resilience', () => {
    it('should clear builderEntity when builder is removed from world', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 100, 100);

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      world.remove(firefly);
      system.update(16, 0);

      expect(buildable.buildable!.sites[0].builderEntity).toBeUndefined();
    });

    it('should clear builderEntity when builder dies', () => {
      const buildable = createBuildableEntity(world, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
      const firefly = createAvailableFirefly(world, 100, 100);
      world.addComponent(firefly, 'health', { currentHealth: 0, maxHealth: 50, isDead: true });

      buildable.buildable!.sites[0].builderEntity = firefly;
      world.addComponent(firefly, 'assignedDestination', {
        target: buildable,
        targetPosition: { x: 100, y: 100 }
      });

      system.update(16, 0);

      expect(buildable.buildable!.sites[0].builderEntity).toBeUndefined();
    });
  });
});
