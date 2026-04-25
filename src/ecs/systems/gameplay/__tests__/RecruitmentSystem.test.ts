import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { RecruitmentSystem } from '../RecruitmentSystem';
import { PathfindingService } from '../PathfindingService';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents } from '@/events';
import {
  createTestFirefly,
  createTestMonster,
  createTestWisp,
  createTestGoal,
  createMockWorker
} from '@/__tests__/helpers';

describe('RecruitmentSystem', () => {
  let world: GameWorld;
  let system: RecruitmentSystem;
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

  function simulateScoreResponse(requestId: string, entityId: number, path: any[] | null) {
    if (path) {
      simulateWorkerResponse({ requestId, entityId, path, pathType: 'score' });
    } else {
      simulateWorkerResponse({ action: 'error', error: 'no path found', entityId, requestId });
    }
  }

  describe('Scoring Requests', () => {
    it('should fire scoring requests for all eligible movers when lodge has capacity', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBe(0);
    });

    it('should not start recruitment when one is already active for the lodge', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages[0].requestId).toBeDefined();
      expect(typeof scoreMessages[0].requestId).toBe('string');
    });

    it('should path from entity position to lodge position for scoring', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages[0].start).toEqual({ x: 100, y: 100 });
      expect(scoreMessages[0].destination).toEqual({ x: 300, y: 300 });
    });
  });

  describe('Assignment', () => {
    it('should assign shortest-path entity when all scoring responses received', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const f1Msg = scoreMessages.find((m: any) => m.entityId === world.id(f1));
      const f2Msg = scoreMessages.find((m: any) => m.entityId === world.id(f2));

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
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 400, y: 400 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const f1Msg = scoreMessages.find((m: any) => m.entityId === world.id(f1));
      const f2Msg = scoreMessages.find((m: any) => m.entityId === world.id(f2));

      simulateScoreResponse(f1Msg.requestId, world.id(f1)!, [
        { x: 100, y: 100 }, { x: 200, y: 200 }, { x: 300, y: 300 }
      ]);
      simulateScoreResponse(f2Msg.requestId, world.id(f2)!, [
        { x: 400, y: 400 }, { x: 300, y: 300 }
      ]);

      expect(f1.assignedDestination).toBeDefined();
      expect(f1.assignedDestination!.target).toBe(wisp);
    });

    it('should handle all candidates being unreachable', () => {
      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
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

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');

      const wisp1Msgs = scoreMessages.filter((m: any) =>
        m.destination.x === 300 && m.destination.y === 300
      );
      const wisp2Msgs = scoreMessages.filter((m: any) =>
        m.destination.x === 400 && m.destination.y === 400
      );

      for (const msg of wisp1Msgs) {
        const dist = msg.entityId === world.id(f1) ? 2 : 5;
        const path = Array(dist).fill({ x: 0, y: 0 });
        simulateScoreResponse(msg.requestId, msg.entityId, path);
      }

      expect(f1.assignedDestination?.target).toBe(wisp1);

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

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      simulateScoreResponse(scoreMessages[0].requestId, world.id(firefly)!, [
        { x: 100, y: 100 }, { x: 300, y: 300 }
      ]);

      expect(firefly.path!.currentPath).toEqual([]);
      expect(firefly.path!.goalPath).toEqual([]);
    });
  });

  describe('No goal exists', () => {
    it('should not recruit when no goal exists for lodge type', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Scoring request timeout', () => {
    it('should finalize recruitment when scoring requests time out', () => {
      vi.useFakeTimers();

      const f1 = createTestFirefly(world, { x: 100, y: 100 });
      const f2 = createTestFirefly(world, { x: 200, y: 200 });
      const wisp = createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      const f1Msg = scoreMessages.find((m: any) => m.entityId === world.id(f1));

      simulateScoreResponse(f1Msg.requestId, world.id(f1)!, [
        { x: 100, y: 100 }, { x: 300, y: 300 }
      ]);

      vi.advanceTimersByTime(5000);

      expect(f1.assignedDestination?.target).toBe(wisp);

      vi.useRealTimers();
    });
  });

  describe('New lodge added mid-game', () => {
    it('should start recruitment for newly added lodge on next update', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      const initialScoreCount = getPostMessagesByType('score').length;
      expect(initialScoreCount).toBe(0);

      createTestWisp(world, { x: 300, y: 300 });
      system.update(16, 16);

      const scoreMessages = getPostMessagesByType('score');
      expect(scoreMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup active recruitments on destroy', () => {
      vi.useFakeTimers();

      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world);

      system = new RecruitmentSystem(world, { pathfinding });
      system.update(16, 16);

      system.destroy!();

      expect((system as any).activeRecruitments.size).toBe(0);

      vi.useRealTimers();
    });
  });
});
