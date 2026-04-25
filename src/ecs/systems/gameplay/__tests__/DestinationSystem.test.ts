import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DestinationSystem } from '../DestinationSystem';
import { PathfindingService } from '../PathfindingService';
import { getEntityType } from '@/utils';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents } from '@/events';
import {
  createTestFirefly,
  createTestMonster,
  createTestWisp,
  createTestGoal,
  createBasicTestSetup,
  createMockWorker
} from '@/__tests__/helpers';

describe('DestinationSystem', () => {
  let world: GameWorld;
  let system: DestinationSystem;
  let pathfinding: PathfindingService;
  let mockWorker: any;

  beforeEach(() => {
    world = new World<Entity>();
    mockWorker = createMockWorker();
    pathfinding = new PathfindingService(mockWorker, world);
    gameEvents.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  function getPostMessages() {
    return mockWorker.postMessage.mock.calls.map((c: any) => c[0]);
  }

  function getPostMessagesByType(pathType: string) {
    return getPostMessages().filter((m: any) => m.pathType === pathType);
  }

  function simulateWorkerResponse(data: any) {
    mockWorker.onmessage({ data });
  }

  function simulateNavResponse(requestId: string, entityId: number, path: any[], pathType: string) {
    simulateWorkerResponse({ requestId, entityId, path, pathType });
  }

  describe('Initialization', () => {
    it('should initialize with pathfinding service', () => {
      system = new DestinationSystem(world, { pathfinding });
      expect((system as any).pathfinding).toBe(pathfinding);
    });
  });

  describe('Entity Type Detection', () => {
    it('should detect firefly entities', () => {
      const entity = createTestFirefly(world);
      expect(getEntityType(entity)).toBe('firefly');
    });

    it('should detect monster entities', () => {
      const entity = createTestMonster(world);
      expect(getEntityType(entity)).toBe('monster');
    });

    it('should detect wisp entities', () => {
      const entity = createTestWisp(world);
      expect(getEntityType(entity)).toBe('wisp');
    });

    it('should detect goal entities', () => {
      const entity = createTestGoal(world);
      expect(getEntityType(entity)).toBe('goal');
    });

    it('should return undefined for untagged entities', () => {
      const entity = world.add({});
      expect(getEntityType(entity)).toBeUndefined();
    });
  });

  describe('Entity Navigation', () => {
    it('should request path to goal for unassigned entity with no current path', () => {
      createBasicTestSetup(world);
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current' || m.pathType === 'next'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].pathType).toBe('current');
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });

    it('should request path to assigned lodge for assigned entity with no current path', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });

    it('should not pre-compute goalPath for assigned entity (it should wait at target)', () => {
      const firefly = createTestFirefly(world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const goalPathMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'next'
      );
      expect(goalPathMessages.length).toBe(0);
    });

    it('should skip all navigation when assignedDestination.holding is true', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      world.addComponent(firefly, 'assignedDestination', { target: wisp, holding: true });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const allMessages = getPostMessages();
      expect(allMessages.length).toBe(0);
    });

    it('should navigate to assigned target when holding is false', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      world.addComponent(firefly, 'assignedDestination', { target: wisp, holding: false });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessages().filter((m: any) => m.pathType === 'current');
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });

    it('should request path to goal for fleeing entity, ignoring assignment', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);
      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });

    it('should not send navigation request when one is already pending', () => {
      createBasicTestSetup(world);
      system = new DestinationSystem(world, { pathfinding });

      system.update(16, 16);
      system.update(16, 16);
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBe(1);
    });

    it('should apply current path from navigation response', () => {
      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMsg = getPostMessages().find((m: any) => m.pathType === 'current');
      simulateNavResponse(navMsg.requestId, world.id(entity)!, [
        { x: 150, y: 150 }, { x: 500, y: 500 }
      ], 'current');

      expect(entity.path!.currentPath).toEqual([
        { x: 150, y: 150 }, { x: 500, y: 500 }
      ]);
    });

    it('should apply goalPath from navigation response', () => {
      const { entity } = createBasicTestSetup(world, {
        currentPath: [{ x: 200, y: 200 }]
      });
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMsg = getPostMessages().find((m: any) => m.pathType === 'next');
      if (navMsg) {
        simulateNavResponse(navMsg.requestId, world.id(entity)!, [
          { x: 300, y: 300 }, { x: 500, y: 500 }
        ], 'next');

        expect(entity.path!.goalPath).toEqual([
          { x: 300, y: 300 }, { x: 500, y: 500 }
        ]);
      }
    });

    it('should discard stale navigation response', () => {
      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const firstNavMsg = getPostMessages().find((m: any) => m.pathType === 'current');
      const staleRequestId = firstNavMsg.requestId;

      simulateWorkerResponse({
        action: 'error',
        error: 'timeout',
        entityId: world.id(entity),
        requestId: staleRequestId
      });

      system.update(16, 16);

      simulateNavResponse(staleRequestId, world.id(entity)!, [
        { x: 999, y: 999 }
      ], 'current');

      expect(entity.path!.currentPath).not.toEqual([{ x: 999, y: 999 }]);
    });

    it('should include entity radius in navigation request', () => {
      createBasicTestSetup(world, { radius: 15 });
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMsg = getPostMessages().find((m: any) => m.pathType === 'current');
      expect(navMsg.radius).toBe(15);
      expect(navMsg.wallBufferMultiplier).toBe(PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER);
    });
  });

  describe('Monsters with no lodges', () => {
    it('should path monsters directly to their goal', () => {
      const monster = createTestMonster(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBe(1);
      expect(navMessages[0].entityId).toBe(world.id(monster));
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });
  });

  describe('No goal exists', () => {
    it('should not request paths when no goal exists', () => {
      createTestFirefly(world);
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Worker Message Handling', () => {
    it('should handle navmeshReady message', () => {
      system = new DestinationSystem(world, { pathfinding });
      expect(() => simulateWorkerResponse({ action: 'navmeshReady' })).not.toThrow();
    });

    it('should handle worker error messages', () => {
      system = new DestinationSystem(world, { pathfinding });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      simulateWorkerResponse({
        action: 'error',
        error: 'Pathfinding failed',
        entityId: 123,
        requestId: 'req-1'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PathfindingService'),
        expect.stringContaining('Pathfinding failed')
      );
      consoleSpy.mockRestore();
    });

    it('should handle messages for non-existent entities gracefully', () => {
      system = new DestinationSystem(world, { pathfinding });

      expect(() => {
        simulateNavResponse('req-999', 999, [{ x: 100, y: 100 }], 'current');
      }).not.toThrow();
    });
  });

  describe('FleeingToGoalTag behavior', () => {
    it('should skip intermediate destinations when entity has fleeingToGoalTag', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination.x).toBe(500);
      expect(navMessages[0].destination.y).toBe(500);
    });

    it('should request goalPath directly to goal when fleeing', () => {
      const firefly = createTestFirefly(world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const goalPathMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'next'
      );
      expect(goalPathMessages.length).toBeGreaterThan(0);
      expect(goalPathMessages[0].destination.x).toBe(500);
      expect(goalPathMessages[0].destination.y).toBe(500);
    });

    it('should handle fleeing entity without goal gracefully', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { pathfinding });
      expect(() => system.update(16, 16)).not.toThrow();
      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup pending requests on destroy', () => {
      vi.useFakeTimers();

      createBasicTestSetup(world);
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      system.destroy!();

      expect((system as any).navigationRequestForEntity.size).toBe(0);

      vi.useRealTimers();
    });

    it('should clear pending request on successful path response', () => {
      vi.useFakeTimers();

      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMsg = getPostMessages().find((m: any) => m.pathType === 'current');
      simulateNavResponse(navMsg.requestId, world.id(entity)!, [
        { x: 200, y: 200 }
      ], 'current');

      system.update(16, 16);
      const nextCount = getPostMessages().filter((m: any) => m.pathType === 'next').length;
      expect(nextCount).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('RedirectTarget handling', () => {
    it('should pathfind to redirectTarget when entity has no currentPath', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 200 });
      createTestGoal(world, { x: 500, y: 200 });

      world.addComponent(firefly, 'redirectTarget', { x: 250, y: 100 });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessagesByType('current');
      expect(navMessages.length).toBe(1);
      expect(navMessages[0].destination).toEqual({ x: 250, y: 100 });
    });

    it('should clear redirectTarget after consuming it', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 200 });
      createTestGoal(world, { x: 500, y: 200 });

      world.addComponent(firefly, 'redirectTarget', { x: 250, y: 100 });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should route goalPath from lastWaypoint to goal after redirect', () => {
      const firefly = createTestFirefly(world, {
        x: 100, y: 200,
        currentPath: [{ x: 250, y: 100 }]
      });
      createTestGoal(world, { x: 500, y: 200 });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const goalPathMessages = getPostMessagesByType('next');
      expect(goalPathMessages.length).toBe(1);
      expect(goalPathMessages[0].start).toEqual({ x: 250, y: 100 });
      expect(goalPathMessages[0].destination).toEqual({ x: 500, y: 200 });
    });

    it('should prefer redirectTarget over goal even when not fleeing', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 200 });
      createTestGoal(world, { x: 500, y: 200 });

      world.addComponent(firefly, 'redirectTarget', { x: 300, y: 300 });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 16);

      const navMessages = getPostMessagesByType('current');
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });
  });

  describe('Wall attack target assignment', () => {
    function createActiveWall(x: number, y: number) {
      return world.add({
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
      const monster = createTestMonster(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });
      createActiveWall(400, 400);

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 0);

      const entityId = world.id(monster)!;
      const navMsg = getPostMessages().find((m: any) => m.entityId === entityId && m.pathType === 'current');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      simulateWorkerResponse({
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
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500 });
      createActiveWall(300, 300);

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 0);

      const entityId = world.id(firefly)!;
      const navMsg = getPostMessages().find((m: any) => m.entityId === entityId && m.pathType === 'current');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: navMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(firefly.wallAttackTarget).toBeUndefined();
    });

    it('should prefer wall closest to monster', () => {
      const monster = createTestMonster(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });
      const nearWall = createActiveWall(200, 200);
      createActiveWall(450, 450);

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 0);

      const entityId = world.id(monster)!;
      const navMsg = getPostMessages().find((m: any) => m.entityId === entityId);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: navMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(monster.wallAttackTarget!.wallEntity).toBe(nearWall);
    });

    it('should try next wall when path to first wall also fails', () => {
      const monster = createTestMonster(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });
      const nearWall = createActiveWall(200, 200);
      const farWall = createActiveWall(450, 450);

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 0);

      const entityId = world.id(monster)!;
      const firstMsg = getPostMessages().find((m: any) => m.entityId === entityId);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: firstMsg.requestId
      });
      expect(monster.wallAttackTarget!.wallEntity).toBe(nearWall);

      system.update(16, 0);
      const secondMsg = getPostMessages().find(
        (m: any) => m.entityId === entityId && m.requestId !== firstMsg.requestId
      );

      simulateWorkerResponse({
        action: 'error',
        error: 'no path found',
        entityId,
        requestId: secondMsg.requestId
      });
      consoleSpy.mockRestore();

      expect(monster.wallAttackTarget!.wallEntity).toBe(farWall);
    });

    it('should clear wallAttackTarget on navmesh update', () => {
      const monster = createTestMonster(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });
      const wall = createActiveWall(300, 300);

      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system = new DestinationSystem(world, { pathfinding });
      simulateWorkerResponse({ action: 'navmeshUpdated' });

      expect(monster.wallAttackTarget).toBeUndefined();
    });

    it('should navigate to wall position when wallAttackTarget is set', () => {
      const monster = createTestMonster(world, { x: 100, y: 100 });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });
      const wall = createActiveWall(300, 300);

      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 0);

      const navMsg = getPostMessages().find(
        (m: any) => m.entityId === world.id(monster) && m.pathType === 'current'
      );
      expect(navMsg.destination.x).toBeLessThan(300);
      expect(navMsg.destination.y).toBeLessThan(300);
    });

    it('should skip goalPath pre-computation for entities with wallAttackTarget', () => {
      const monster = createTestMonster(world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      createTestGoal(world, { x: 500, y: 500, for: 'monster' });
      const wall = createActiveWall(300, 300);

      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system = new DestinationSystem(world, { pathfinding });
      system.update(16, 0);

      const nextMsgs = getPostMessagesByType('next');
      const monsterMsgs = nextMsgs.filter((m: any) => m.entityId === world.id(monster));
      expect(monsterMsgs.length).toBe(0);
    });
  });
});
