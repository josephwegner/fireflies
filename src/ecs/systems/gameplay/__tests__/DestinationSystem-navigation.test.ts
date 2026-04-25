import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DestinationSystem } from '../DestinationSystem';
import { getEntityType } from '@/utils';
import {
  createTestFirefly,
  createTestMonster,
  createTestWisp,
  createTestGoal,
} from '@/__tests__/helpers';
import { createDestinationTestSetup, type DestinationTestSetup } from './DestinationSystem-helpers';

describe('DestinationSystem — navigation', () => {
  let t: DestinationTestSetup;
  let system: DestinationSystem;

  beforeEach(() => {
    t = createDestinationTestSetup();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Entity Type Detection', () => {
    it('should detect firefly entities', () => {
      const entity = createTestFirefly(t.world);
      expect(getEntityType(entity)).toBe('firefly');
    });

    it('should detect monster entities', () => {
      const entity = createTestMonster(t.world);
      expect(getEntityType(entity)).toBe('monster');
    });

    it('should detect wisp entities', () => {
      const entity = createTestWisp(t.world);
      expect(getEntityType(entity)).toBe('wisp');
    });

    it('should detect goal entities', () => {
      const entity = createTestGoal(t.world);
      expect(getEntityType(entity)).toBe('goal');
    });

    it('should return undefined for untagged entities', () => {
      const entity = t.world.add({});
      expect(getEntityType(entity)).toBeUndefined();
    });
  });

  describe('FleeingToGoalTag behavior', () => {
    it('should skip intermediate destinations when entity has fleeingToGoalTag', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world, { x: 500, y: 500 });

      t.world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination.x).toBe(500);
      expect(navMessages[0].destination.y).toBe(500);
    });

    it('should request goalPath directly to goal when fleeing', () => {
      const firefly = createTestFirefly(t.world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world, { x: 500, y: 500 });

      t.world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const goalPathMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'next'
      );
      expect(goalPathMessages.length).toBeGreaterThan(0);
      expect(goalPathMessages[0].destination.x).toBe(500);
      expect(goalPathMessages[0].destination.y).toBe(500);
    });

    it('should handle fleeing entity without goal gracefully', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      t.world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      expect(() => system.update(16, 16)).not.toThrow();
      expect(t.mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Wall attack target assignment', () => {
    function createActiveWall(x: number, y: number) {
      return t.world.add({
        position: { x, y },
        buildable: {
          sites: [
            { x: x - 20, y, built: true, buildProgress: 1 },
            { x: x + 20, y, built: true, buildProgress: 1 }
          ],
          buildTime: 2,
          allBuilt: true
        },
        wallBlueprint: { active: true },
        wallBlueprintTag: true,
        health: { currentHealth: 100, maxHealth: 100, isDead: false }
      });
    }

    it('should assign wallAttackTarget on path failure for monsters', () => {
      const monster = createTestMonster(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });
      createActiveWall(400, 400);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 0);

      const entityId = t.world.id(monster)!;
      const navMsg = t.getPostMessages().find((m: any) => m.entityId === entityId && m.pathType === 'current');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      t.simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: navMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(monster.wallAttackTarget).toBeDefined();
      expect(monster.wallAttackTarget!.wallEntity.wallBlueprint!.active).toBe(true);
    });

    it('should not assign wallAttackTarget for fireflies', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500 });
      createActiveWall(300, 300);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 0);

      const entityId = t.world.id(firefly)!;
      const navMsg = t.getPostMessages().find((m: any) => m.entityId === entityId && m.pathType === 'current');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      t.simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: navMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(firefly.wallAttackTarget).toBeUndefined();
    });

    it('should prefer wall closest to monster', () => {
      const monster = createTestMonster(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });
      const nearWall = createActiveWall(200, 200);
      createActiveWall(450, 450);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 0);

      const entityId = t.world.id(monster)!;
      const navMsg = t.getPostMessages().find((m: any) => m.entityId === entityId);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      t.simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: navMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(monster.wallAttackTarget!.wallEntity).toBe(nearWall);
    });

    it('should try next wall when path to first wall also fails', () => {
      const monster = createTestMonster(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });
      const nearWall = createActiveWall(200, 200);
      const farWall = createActiveWall(450, 450);

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 0);

      const entityId = t.world.id(monster)!;
      const firstMsg = t.getPostMessages().find((m: any) => m.entityId === entityId);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      t.simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: firstMsg.requestId
      });
      expect(monster.wallAttackTarget!.wallEntity).toBe(nearWall);

      system.update(16, 0);
      const secondMsg = t.getPostMessages().find(
        (m: any) => m.entityId === entityId && m.requestId !== firstMsg.requestId
      );

      t.simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: secondMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(monster.wallAttackTarget!.wallEntity).toBe(farWall);
    });

    it('should clear wallAttackTarget on navmesh update', () => {
      const monster = createTestMonster(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });
      const wall = createActiveWall(300, 300);

      t.world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      t.simulateWorkerResponse({ action: 'navmeshUpdated' });

      expect(monster.wallAttackTarget).toBeUndefined();
    });

    it('should navigate to wall position when wallAttackTarget is set', () => {
      const monster = createTestMonster(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });
      const wall = createActiveWall(300, 300);

      t.world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 0);

      const navMsg = t.getPostMessages().find(
        (m: any) => m.entityId === t.world.id(monster) && m.pathType === 'current'
      );
      expect(navMsg.destination.x).toBeLessThan(300);
      expect(navMsg.destination.y).toBeLessThan(300);
    });

    it('should skip goalPath pre-computation for entities with wallAttackTarget', () => {
      const monster = createTestMonster(t.world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });
      const wall = createActiveWall(300, 300);

      t.world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 0);

      const nextMsgs = t.getPostMessagesByType('next');
      const monsterMsgs = nextMsgs.filter((m: any) => m.entityId === t.world.id(monster));
      expect(monsterMsgs.length).toBe(0);
    });
  });
});
