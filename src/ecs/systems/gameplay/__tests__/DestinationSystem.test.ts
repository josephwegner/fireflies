import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DestinationSystem } from '../DestinationSystem';
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
  let mockWorker: any;

  beforeEach(() => {
    world = new World<Entity>();
    mockWorker = createMockWorker();
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

  function simulateScoreResponse(requestId: string, entityId: number, path: any[] | null) {
    if (path) {
      simulateWorkerResponse({ requestId, entityId, path, pathType: 'score' });
    } else {
      simulateWorkerResponse({ action: 'error', error: 'no path found', entityId, requestId });
    }
  }

  function simulateNavResponse(requestId: string, entityId: number, path: any[], pathType: string) {
    simulateWorkerResponse({ requestId, entityId, path, pathType });
  }

  describe('Initialization', () => {
    it('should initialize with worker', () => {
      system = new DestinationSystem(world, { worker: mockWorker });
      expect((system as any).worker).toBe(mockWorker);
    });

    it('should setup worker message handler', () => {
      system = new DestinationSystem(world, { worker: mockWorker });
      expect(mockWorker.onmessage).toBeDefined();
      expect(typeof mockWorker.onmessage).toBe('function');
    });

    it('should setup worker error handler', () => {
      system = new DestinationSystem(world, { worker: mockWorker });
      expect(mockWorker.onerror).toBeDefined();
      expect(typeof mockWorker.onerror).toBe('function');
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

  describe('Lodge Recruitment — Scoring Requests', () => {
    it('should fire scoring requests for all eligible movers when lodge has capacity', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBe(2);

      const scoredEntityIds = scoreMessages.map((m: any) => m.entityId);
      expect(scoredEntityIds).toContain(world.id(f1));
      expect(scoredEntityIds).toContain(world.id(f2));
    });

    it('should not recruit when lodge is at capacity (tenants)', () => {
      const tenant = createTestFirefly(world, { x: 300, y: 300 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      wisp.lodge!.tenants = [tenant];

      createTestFirefly(world, { x: 100, y: 100 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBe(0);
    });

    it('should not recruit when lodge is at capacity (incoming)', () => {
      const incoming = createTestFirefly(world, { x: 200, y: 200 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      wisp.lodge!.incoming = [incoming];

      createTestFirefly(world, { x: 100, y: 100 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBe(0);
    });

    it('should not start recruitment when one is already active for the lodge', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const firstCount = getPostMessagesByType('score').length;

      system.update(16, 16);

      const secondCount = getPostMessagesByType('score').length;
      expect(secondCount).toBe(firstCount);
    });

    it('should ignore entities with fleeingToGoalTag for recruitment', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      world.addComponent(firefly, 'fleeingToGoalTag', true);

      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBe(0);
    });

    it('should ignore entities already assigned to a lodge', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      const wisp1 = createTestWisp(world, { x: 300, y: 300 });
      createTestWisp(world, { x: 400, y: 400 });
      createTestGoal(world);

      world.addComponent(firefly, 'assignedDestination', { target: wisp1 });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBe(0);
    });

    it('should only score entities matching lodge allowedTeam', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestMonster(world, { x: 200, y: 200 });
      createTestWisp(world, { x: 300, y: 300, for: 'firefly' });
      createTestGoal(world);
      createTestGoal(world, { for: 'monster' });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const firefly = world.with('fireflyTag').first!;
      expect(scoreMessages.length).toBe(1);
      expect(scoreMessages[0].entityId).toBe(world.id(firefly));
    });

    it('should include requestId in scoring requests', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages[0].requestId).toBeDefined();
      expect(typeof scoreMessages[0].requestId).toBe('string');
    });

    it('should path from entity position to lodge position for scoring', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages[0].start).toEqual({ x: 100, y: 100 });
      expect(scoreMessages[0].destination).toEqual({ x: 300, y: 300 });
    });
  });

  describe('Lodge Recruitment — Assignment', () => {
    it('should assign shortest-path entity when all scoring responses received', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const f1Msg = scoreMessages.find((m: any) => m.entityId === world.id(f1));
      const f2Msg = scoreMessages.find((m: any) => m.entityId === world.id(f2));

      // f2 is closer (shorter path = 3 points)
      simulateScoreResponse(f1Msg.requestId, world.id(f1)!, [
        { x: 100, y: 100 }, { x: 150, y: 150 }, { x: 200, y: 200 }, { x: 300, y: 300 }
      ]);
      simulateScoreResponse(f2Msg.requestId, world.id(f2)!, [
        { x: 200, y: 200 }, { x: 300, y: 300 }
      ]);

      expect(f2.assignedDestination).toBeDefined();
      expect(f2.assignedDestination!.target).toBe(wisp);
      expect(wisp.lodge!.incoming).toContain(f2);
    });

    it('should apply backtracking penalty when entity is behind lodge relative to goal', () => {
      // Goal is at 500,500. Wisp at 300,300.
      // f1 is at 100,100 (in front of wisp, going toward goal)
      // f2 is at 400,400 (past the wisp, but closer by raw distance)
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 400, y: 400 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const f1Msg = scoreMessages.find((m: any) => m.entityId === world.id(f1));
      const f2Msg = scoreMessages.find((m: any) => m.entityId === world.id(f2));

      // f2 has shorter raw path but is backtracking (past wisp toward goal)
      simulateScoreResponse(f1Msg.requestId, world.id(f1)!, [
        { x: 100, y: 100 }, { x: 200, y: 200 }, { x: 300, y: 300 }
      ]);
      // f2 raw distance is short but goes backward
      simulateScoreResponse(f2Msg.requestId, world.id(f2)!, [
        { x: 400, y: 400 }, { x: 300, y: 300 }
      ]);

      // f2 is backtracking so penalty should make f1 win
      expect(f1.assignedDestination).toBeDefined();
      expect(f1.assignedDestination!.target).toBe(wisp);
    });

    it('should handle all candidates being unreachable', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      simulateScoreResponse(scoreMessages[0].requestId, world.id(f1)!, null);

      expect(f1.assignedDestination).toBeUndefined();
      expect(wisp.lodge!.incoming).toHaveLength(0);
    });

    it('should skip assigned entity when finalizing and pick next best', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      const wisp1 = createTestWisp(world, { x: 300, y: 300 });
      const wisp2 = createTestWisp(world, { x: 400, y: 400 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');

      // Find wisp1's scoring requests
      const wisp1Msgs = scoreMessages.filter((m: any) =>
        m.destination.x === 300 && m.destination.y === 300
      );
      const wisp2Msgs = scoreMessages.filter((m: any) =>
        m.destination.x === 400 && m.destination.y === 400
      );

      // Finalize wisp1 first — f1 is closest
      for (const msg of wisp1Msgs) {
        const dist = msg.entityId === world.id(f1) ? 2 : 5;
        const path = Array(dist).fill({ x: 0, y: 0 });
        simulateScoreResponse(msg.requestId, msg.entityId, path);
      }

      // f1 should be assigned to wisp1
      expect(f1.assignedDestination?.target).toBe(wisp1);

      // Now finalize wisp2 — f1 is closest raw but already assigned, so f2 should win
      for (const msg of wisp2Msgs) {
        const dist = msg.entityId === world.id(f1) ? 1 : 3;
        const path = Array(dist).fill({ x: 0, y: 0 });
        simulateScoreResponse(msg.requestId, msg.entityId, path);
      }

      expect(f2.assignedDestination?.target).toBe(wisp2);
    });

    it('should clear entity paths when assigned to a lodge', () => {
      const firefly = createTestFirefly(world, {
        x: 100, y: 100,
        currentPath: [{ x: 150, y: 150 }],
        goalPath: [{ x: 200, y: 200 }]
      });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      simulateScoreResponse(scoreMessages[0].requestId, world.id(firefly)!, [
        { x: 100, y: 100 }, { x: 300, y: 300 }
      ]);

      expect(firefly.path!.currentPath).toEqual([]);
      expect(firefly.path!.goalPath).toEqual([]);
    });
  });

  describe('Entity Navigation', () => {
    it('should request path to goal for unassigned entity with no current path', () => {
      createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });
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

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });

    it('should request goalPath from lodge to goal for assigned entity', () => {
      const firefly = createTestFirefly(world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const goalPathMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'next'
      );
      expect(goalPathMessages.length).toBeGreaterThan(0);
      expect(goalPathMessages[0].start).toEqual({ x: 300, y: 300 });
      expect(goalPathMessages[0].destination).toEqual({ x: 500, y: 500 });
    });

    it('should request path to goal for fleeing entity, ignoring assignment', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);
      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const navMessages = getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });

    it('should not send navigation request when one is already pending', () => {
      createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

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
      system = new DestinationSystem(world, { worker: mockWorker });
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
      system = new DestinationSystem(world, { worker: mockWorker });
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
      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const firstNavMsg = getPostMessages().find((m: any) => m.pathType === 'current');
      const staleRequestId = firstNavMsg.requestId;

      // Clear pending and trigger a new request
      simulateWorkerResponse({
        action: 'error',
        error: 'timeout',
        entityId: world.id(entity),
        requestId: staleRequestId
      });

      system.update(16, 16);

      // Now the stale response arrives
      simulateNavResponse(staleRequestId, world.id(entity)!, [
        { x: 999, y: 999 }
      ], 'current');

      // Should NOT have the stale path
      expect(entity.path!.currentPath).not.toEqual([{ x: 999, y: 999 }]);
    });

    it('should include entity radius in navigation request', () => {
      createBasicTestSetup(world, { radius: 15 });
      system = new DestinationSystem(world, { worker: mockWorker });
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

      system = new DestinationSystem(world, { worker: mockWorker });
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
      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });

    it('should not recruit when no goal exists for lodge type', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Worker Message Handling', () => {
    it('should handle navmeshReady message', () => {
      system = new DestinationSystem(world, { worker: mockWorker });
      expect(() => simulateWorkerResponse({ action: 'navmeshReady' })).not.toThrow();
    });

    it('should handle worker error messages', () => {
      system = new DestinationSystem(world, { worker: mockWorker });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      simulateWorkerResponse({
        action: 'error',
        error: 'Pathfinding failed',
        entityId: 123,
        requestId: 'req-1'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DestinationSystem'),
        expect.stringContaining('Pathfinding failed')
      );
      consoleSpy.mockRestore();
    });

    it('should handle messages for non-existent entities gracefully', () => {
      system = new DestinationSystem(world, { worker: mockWorker });

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

      system = new DestinationSystem(world, { worker: mockWorker });
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

      system = new DestinationSystem(world, { worker: mockWorker });
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

      system = new DestinationSystem(world, { worker: mockWorker });
      expect(() => system.update(16, 16)).not.toThrow();
      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup pending requests on destroy', () => {
      vi.useFakeTimers();

      createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      system.destroy!();

      expect((system as any).pendingRequests.size).toBe(0);
      expect((system as any).activeRecruitments.size).toBe(0);

      vi.useRealTimers();
    });

    it('should clear pending request on successful path response', () => {
      vi.useFakeTimers();

      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const navMsg = getPostMessages().find((m: any) => m.pathType === 'current');
      simulateNavResponse(navMsg.requestId, world.id(entity)!, [
        { x: 200, y: 200 }
      ], 'current');

      // After receiving current path, entity has currentPath and empty goalPath
      // so next update should trigger a 'next' path request
      system.update(16, 16);
      const nextCount = getPostMessages().filter((m: any) => m.pathType === 'next').length;
      expect(nextCount).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('Scoring request timeout', () => {
    it('should finalize recruitment when scoring requests time out', () => {
      vi.useFakeTimers();

      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const f1Msg = scoreMessages.find((m: any) => m.entityId === world.id(f1));

      // Only f1 responds, f2 times out
      simulateScoreResponse(f1Msg.requestId, world.id(f1)!, [
        { x: 100, y: 100 }, { x: 300, y: 300 }
      ]);

      // Fast-forward past timeout
      vi.advanceTimersByTime(5000);

      // f1 should be assigned since it was the only successful response
      expect(f1.assignedDestination?.target).toBe(wisp);

      vi.useRealTimers();
    });
  });

  describe('New lodge added mid-game', () => {
    it('should start recruitment for newly added lodge on next update', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      // No wisps, so no scoring requests
      const initialScoreCount = getPostMessagesByType('score').length;
      expect(initialScoreCount).toBe(0);

      // Add a wisp mid-game
      createTestWisp(world, { x: 300, y: 300 });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBeGreaterThan(0);
    });
  });

  describe('RedirectTarget handling', () => {
    it('should pathfind to redirectTarget when entity has no currentPath', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 200 });
      createTestGoal(world, { x: 500, y: 200 });

      world.addComponent(firefly, 'redirectTarget', { x: 250, y: 100 });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const navMessages = getPostMessagesByType('current');
      expect(navMessages.length).toBe(1);
      expect(navMessages[0].destination).toEqual({ x: 250, y: 100 });
    });

    it('should clear redirectTarget after consuming it', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 200 });
      createTestGoal(world, { x: 500, y: 200 });

      world.addComponent(firefly, 'redirectTarget', { x: 250, y: 100 });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should route goalPath from lastWaypoint to goal after redirect', () => {
      const firefly = createTestFirefly(world, {
        x: 100, y: 200,
        currentPath: [{ x: 250, y: 100 }]
      });
      createTestGoal(world, { x: 500, y: 200 });

      system = new DestinationSystem(world, { worker: mockWorker });
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

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const navMessages = getPostMessagesByType('current');
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });
  });

});
