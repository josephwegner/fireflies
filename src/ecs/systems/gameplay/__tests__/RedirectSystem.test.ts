import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { RedirectSystem } from '../RedirectSystem';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import {
  createTestFirefly,
  createTestMonster,
  createTestRedirect,
  createTestGoal
} from '@/__tests__/helpers/entities';

describe('RedirectSystem', () => {
  let world: GameWorld;
  let system: RedirectSystem;

  beforeEach(() => {
    world = new World<Entity>();
    system = new RedirectSystem(world, {});
  });

  afterEach(() => {
    system.destroy();
    gameEvents.clear();
  });

  describe('basic redirect', () => {
    it('should assign redirectTarget when entity enters redirect radius', () => {
      const redirect = createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });

      system.update(16, 0);

      expect(firefly.redirectTarget).toBeDefined();
      const jitter = PHYSICS_CONFIG.POSITION_JITTER / 4;
      expect(firefly.redirectTarget!.x).toBeGreaterThanOrEqual(200 - jitter);
      expect(firefly.redirectTarget!.x).toBeLessThanOrEqual(200 + jitter);
      expect(firefly.redirectTarget!.y).toBeGreaterThanOrEqual(100 - jitter);
      expect(firefly.redirectTarget!.y).toBeLessThanOrEqual(100 + jitter);
    });

    it('should clear currentPath and goalPath when assigning redirect', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, {
        x: 210, y: 210,
        currentPath: [{ x: 300, y: 300 }, { x: 400, y: 400 }],
        goalPath: [{ x: 500, y: 500 }]
      });

      system.update(16, 0);

      expect(firefly.redirectTarget).toBeDefined();
      expect(firefly.path!.currentPath).toEqual([]);
      expect(firefly.path!.goalPath).toEqual([]);
    });

    it('should not assign redirectTarget when entity is outside radius', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 400, y: 400 });

      system.update(16, 0);

      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should not re-trigger the same redirect for an entity', () => {
      const redirect = createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });

      system.update(16, 0);
      expect(firefly.redirectTarget).toBeDefined();

      world.removeComponent(firefly, 'redirectTarget');

      system.update(16, 0);
      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should NOT re-trigger after entity leaves and re-enters radius (one-time-only)', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });

      system.update(16, 0);
      expect(firefly.redirectTarget).toBeDefined();

      world.removeComponent(firefly, 'redirectTarget');

      // Move outside radius
      firefly.position!.x = 400;
      firefly.position!.y = 400;
      system.update(16, 0);

      // Move back inside radius — should NOT re-trigger
      firefly.position!.x = 210;
      firefly.position!.y = 210;
      system.update(16, 0);

      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should not re-trigger after NAVMESH_UPDATED (redirect is permanent one-time-only)', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });

      // First trigger
      system.update(16, 0);
      expect(firefly.redirectTarget).toBeDefined();

      world.removeComponent(firefly, 'redirectTarget');

      // Navmesh update does NOT clear tracking — redirect stays one-time-only
      gameEvents.emit(GameEvents.NAVMESH_UPDATED, {});

      system.update(16, 0);
      expect(firefly.redirectTarget).toBeUndefined();
    });
  });

  describe('weighted selection', () => {
    it('should distribute exits according to weights', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [
          { x: 200, y: 100, weight: 1 },
          { x: 200, y: 300, weight: 3 }
        ],
        for: 'firefly',
        radius: 50
      });

      const jitter = PHYSICS_CONFIG.POSITION_JITTER / 4;
      const isUpper = (y: number) => y < 200;
      const counts = { upper: 0, lower: 0 };
      const randomSpy = vi.spyOn(Math, 'random');

      // roll=0.1*4=0.4, weight1=1 → 0.4-1=-0.6 ≤ 0 → upper exit (y=100)
      randomSpy.mockReturnValue(0.1);
      const f1 = createTestFirefly(world, { x: 210, y: 210 });
      system.update(16, 0);
      if (isUpper(f1.redirectTarget!.y)) counts.upper++;
      else counts.lower++;

      // roll=0.3*4=1.2, weight1=1 → 1.2-1=0.2, weight2=3 → 0.2-3=-2.8 ≤ 0 → lower exit (y=300)
      randomSpy.mockReturnValue(0.3);
      const f2 = createTestFirefly(world, { x: 215, y: 215 });
      system.update(16, 0);
      if (isUpper(f2.redirectTarget!.y)) counts.upper++;
      else counts.lower++;

      // roll=0.9*4=3.6, weight1=1 → 3.6-1=2.6, weight2=3 → 2.6-3=-0.4 ≤ 0 → lower exit (y=300)
      randomSpy.mockReturnValue(0.9);
      const f3 = createTestFirefly(world, { x: 220, y: 205 });
      system.update(16, 0);
      if (isUpper(f3.redirectTarget!.y)) counts.upper++;
      else counts.lower++;

      randomSpy.mockRestore();

      expect(counts.upper).toBe(1);
      expect(counts.lower).toBe(2);
    });
  });

  describe('type filtering', () => {
    it('should ignore redirects not matching entity type', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'monster',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });

      system.update(16, 0);

      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should redirect monsters when type matches', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'monster',
        radius: 50
      });

      const monster = createTestMonster(world, { x: 210, y: 210 });

      system.update(16, 0);

      expect(monster.redirectTarget).toBeDefined();
    });
  });

  describe('destination filtering', () => {
    it('should skip entities with an assignedDestination', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });
      const lodge = world.add({ position: { x: 300, y: 300 } });
      world.addComponent(firefly, 'assignedDestination', { target: lodge });

      system.update(16, 0);

      expect(firefly.redirectTarget).toBeUndefined();
    });
  });

  describe('jitter', () => {
    it('should add jitter to exit positions', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const results: { x: number; y: number }[] = [];

      for (let i = 0; i < 10; i++) {
        const firefly = createTestFirefly(world, { x: 210 + i, y: 210 });
        system.update(16, 0);
        if (firefly.redirectTarget) {
          results.push({ ...firefly.redirectTarget });
        }
      }

      expect(results.length).toBe(10);

      const jitter = PHYSICS_CONFIG.POSITION_JITTER / 4;
      for (const result of results) {
        expect(result.x).toBeGreaterThanOrEqual(200 - jitter);
        expect(result.x).toBeLessThanOrEqual(200 + jitter);
        expect(result.y).toBeGreaterThanOrEqual(100 - jitter);
        expect(result.y).toBeLessThanOrEqual(100 + jitter);
      }
    });
  });

  describe('chaining', () => {
    it('should allow a second redirect after the first is consumed', () => {
      createTestRedirect(world, {
        x: 100, y: 100,
        exits: [{ x: 150, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      createTestRedirect(world, {
        x: 300, y: 100,
        exits: [{ x: 350, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 105, y: 100 });

      system.update(16, 0);
      expect(firefly.redirectTarget).toBeDefined();

      world.removeComponent(firefly, 'redirectTarget');
      firefly.position!.x = 105;

      system.update(16, 0);
      expect(firefly.redirectTarget).toBeUndefined();

      firefly.position!.x = 305;
      system.update(16, 0);
      expect(firefly.redirectTarget).toBeDefined();
      expect(firefly.redirectTarget!.x).toBeGreaterThanOrEqual(350 - PHYSICS_CONFIG.POSITION_JITTER / 4);
    });
  });

  describe('entity cleanup', () => {
    it('should clean up tracking when entity is removed from world', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });
      system.update(16, 0);
      expect(firefly.redirectTarget).toBeDefined();

      world.remove(firefly);

      const firefly2 = createTestFirefly(world, { x: 210, y: 210 });
      system.update(16, 0);
      expect(firefly2.redirectTarget).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single exit redirect', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 210, y: 210 });
      system.update(16, 0);

      expect(firefly.redirectTarget).toBeDefined();
    });

    it('should not affect entities without position', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      system.update(16, 0);
    });

    it('should not assign redirectTarget if entity already has one', () => {
      createTestRedirect(world, {
        x: 200, y: 200,
        exits: [{ x: 200, y: 100, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      createTestRedirect(world, {
        x: 210, y: 210,
        exits: [{ x: 210, y: 300, weight: 1 }],
        for: 'firefly',
        radius: 50
      });

      const firefly = createTestFirefly(world, { x: 205, y: 205 });
      system.update(16, 0);

      expect(firefly.redirectTarget).toBeDefined();
    });
  });
});
