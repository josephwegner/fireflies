import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DestinationSystem } from '../DestinationSystem';
import { getEntityType } from '@/utils';
import { PHYSICS_CONFIG } from '@/config';
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
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

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

  describe('Path Requests', () => {
    it('should request path when entity has no current path', () => {
      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalled();
      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.action).toBe('pathfind');
      expect(call.entityId).toBe(world.id(entity));
      expect(call.pathType).toBe('current');
    });

    it('should not spam requests when already waiting for response', () => {
      createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);
      system.update(16, 16);
      system.update(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    });

    it('should request next path when current path exists but next path is empty', () => {
      const { entity } = createBasicTestSetup(world, {
        currentPath: [{ x: 200, y: 200 }]
      });
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalled();
      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.action).toBe('pathfind');
      expect(call.pathType).toBe('next');
      expect(call.start).toEqual({ x: 200, y: 200 });
    });

    it('should include entity radius in path request', () => {
      createBasicTestSetup(world, { radius: 15 });
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.radius).toBe(15);
      expect(call.wallBufferMultiplier).toBe(PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER);
    });

    it('should use radius 0 if entity has no Renderable component', () => {
      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], nextPath: [], direction: 'r' },
        fireflyTag: true
      });

      createTestGoal(world);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.radius).toBe(0);
    });
  });

  describe('Worker Message Handling', () => {
    it('should handle navmeshReady message', () => {
      system = new DestinationSystem(world, { worker: mockWorker });

      const event = { data: { action: 'navmeshReady' } };

      expect(() => mockWorker.onmessage(event)).not.toThrow();
    });

    it('should apply path to entity when receiving pathfinding result', () => {
      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      const newPath = [
        { x: 150, y: 150 },
        { x: 200, y: 200 },
        { x: 250, y: 250 }
      ];

      mockWorker.onmessage({
        data: {
          entityId: world.id(entity),
          path: newPath,
          pathType: 'current'
        }
      });

      expect(entity.path!.currentPath).toEqual(newPath);
    });

    it('should apply next path when pathType is next', () => {
      const { entity } = createBasicTestSetup(world, {
        currentPath: [{ x: 200, y: 200 }]
      });
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      const newPath = [
        { x: 300, y: 300 },
        { x: 400, y: 400 }
      ];

      mockWorker.onmessage({
        data: {
          entityId: world.id(entity),
          path: newPath,
          pathType: 'next'
        }
      });

      expect(entity.path!.nextPath).toEqual(newPath);
      expect(entity.path!.currentPath).toEqual([{ x: 200, y: 200 }]);
    });

    it('should handle worker error messages', () => {
      system = new DestinationSystem(world, { worker: mockWorker });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockWorker.onmessage({
        data: {
          action: 'error',
          error: 'Pathfinding failed',
          entityId: 123
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith('[DestinationSystem] Worker error:', 'Pathfinding failed');
      consoleSpy.mockRestore();
    });

    it('should handle messages for non-existent entities gracefully', () => {
      system = new DestinationSystem(world, { worker: mockWorker });

      expect(() => {
        mockWorker.onmessage({
          data: {
            entityId: 999,
            path: [{ x: 100, y: 100 }],
            pathType: 'current'
          }
        });
      }).not.toThrow();
    });
  });

  describe('Destination Selection', () => {
    it('should find goal destination for entity type', () => {
      createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      expect(goalDest).not.toBeNull();
    });

    it('should return null when no goal exists for entity type', () => {
      createTestFirefly(world);
      createTestGoal(world, { for: ['monster'] });
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      expect(goalDest).toBeNull();
    });

    it('should gather intermediate destinations', () => {
      createTestFirefly(world);
      const wisp = createTestWisp(world);
      createTestGoal(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      const destinations = (system as any).gatherDestinations(
        { x: 100, y: 100 },
        goalDest,
        'firefly',
        'r',
        0
      );

      expect(destinations.length).toBeGreaterThan(0);
      expect(destinations.some((d: any) => d.entity === wisp)).toBe(true);
    });

    it('should exclude goal from intermediate destinations', () => {
      createTestFirefly(world);
      const goal = createTestGoal(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      const destinations = (system as any).gatherDestinations(
        { x: 100, y: 100 },
        goalDest,
        'firefly',
        'r',
        0
      );

      expect(destinations.some((d: any) => d.entity === goal)).toBe(false);
    });

    it('should filter destinations by entity type', () => {
      createTestFirefly(world);
      const wispForFirefly = createTestWisp(world, { x: 300, y: 300, for: ['firefly'] });
      const wispForMonster = createTestWisp(world, { x: 350, y: 350, for: ['monster'] });
      createTestGoal(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      const destinations = (system as any).gatherDestinations(
        { x: 100, y: 100 },
        goalDest,
        'firefly',
        'r',
        0
      );

      expect(destinations.some((d: any) => d.entity === wispForFirefly)).toBe(true);
      expect(destinations.some((d: any) => d.entity === wispForMonster)).toBe(false);
    });

    it('should score destinations by progress and proximity', () => {
      createTestFirefly(world);
      createTestWisp(world, { x: 300, y: 300 });
      createTestWisp(world, { x: 200, y: 200 });
      createTestGoal(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      const destinations = (system as any).gatherDestinations(
        { x: 100, y: 100 },
        goalDest,
        'firefly',
        'r',
        0
      );

      expect(destinations.length).toBeGreaterThan(0);
      destinations.forEach((dest: any) => {
        expect(dest.score).toBeGreaterThan(0);
        expect(dest.progressPercent).toBeGreaterThan(0);
        expect(dest.pathProximityFactor).toBeGreaterThan(0);
      });
    });

    it('should return empty array when at destination', () => {
      createTestFirefly(world, { x: 500, y: 500 });
      createTestGoal(world, { x: 500, y: 500 });
      system = new DestinationSystem(world, { worker: mockWorker });

      const goalDest = (system as any).findGoalDestination('firefly');
      const destinations = (system as any).gatherDestinations(
        { x: 500, y: 500 },
        goalDest,
        'firefly',
        'r',
        0
      );

      expect(destinations).toEqual([]);
    });
  });

  describe('Timeout Handling', () => {
    it('should clear pending request on successful path response', () => {
      vi.useFakeTimers();

      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      mockWorker.onmessage({
        data: {
          entityId: world.id(entity),
          path: [{ x: 200, y: 200 }],
          pathType: 'current'
        }
      });

      system.update(16, 16);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should clear pending request on worker error', () => {
      vi.useFakeTimers();

      const { entity } = createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWorker.onmessage({
        data: {
          action: 'error',
          error: 'Pathfinding failed',
          entityId: world.id(entity)
        }
      });
      consoleSpy.mockRestore();

      system.update(16, 16);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should cleanup pending requests on destroy', () => {
      vi.useFakeTimers();

      createBasicTestSetup(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      expect((system as any).pendingRequests.size).toBe(1);

      system.destroy!();
      expect((system as any).pendingRequests.size).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should not request path when no goal exists', () => {
      createTestFirefly(world);
      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('FleeingToGoalTag behavior', () => {
    it('should skip intermediate destinations when entity has FleeingToGoalTag', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalled();
      const call = mockWorker.postMessage.mock.calls[0][0];

      expect(call.destination.x).toBe(500);
      expect(call.destination.y).toBe(500);
    });

    it('should go directly to goal without considering wisps when fleeing', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });

      createTestWisp(world, { x: 200, y: 200, for: ['firefly'] });
      createTestWisp(world, { x: 300, y: 300, for: ['firefly'] });
      createTestWisp(world, { x: 400, y: 400, for: ['firefly'] });

      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const call = mockWorker.postMessage.mock.calls[0][0];

      expect(call.destination.x).toBe(500);
      expect(call.destination.y).toBe(500);
    });

    it('should visit intermediate destinations when not fleeing', () => {
      createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      const call = mockWorker.postMessage.mock.calls[0][0];

      expect(call.destination).toBeDefined();
      expect(call.destination.x).toBeDefined();
      expect(call.destination.y).toBeDefined();
    });

    it('should request path directly to goal for next path when fleeing', () => {
      const firefly = createTestFirefly(world, {
        x: 100,
        y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { worker: mockWorker });
      system.update(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalled();
      const call = mockWorker.postMessage.mock.calls[0][0];

      expect(call.pathType).toBe('next');
      expect(call.destination.x).toBe(500);
      expect(call.destination.y).toBe(500);
    });

    it('should handle fleeing entity without goal gracefully', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system = new DestinationSystem(world, { worker: mockWorker });

      expect(() => system.update(16, 16)).not.toThrow();

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });

    it('should allow fleeing to be added after initial path request', () => {
      const firefly = createTestFirefly(world, { x: 100, y: 100 });
      createTestWisp(world, { x: 300, y: 300 });
      createTestGoal(world, { x: 500, y: 500 });

      system = new DestinationSystem(world, { worker: mockWorker });

      system.update(16, 16);

      let firstCall = mockWorker.postMessage.mock.calls[0][0];
      expect(firstCall.destination).toBeDefined();

      mockWorker.onmessage({
        data: {
          entityId: world.id(firefly),
          path: [{ x: 200, y: 200 }],
          pathType: 'current'
        }
      });

      world.addComponent(firefly, 'fleeingToGoalTag', true);

      system.update(16, 16);

      let secondCall = mockWorker.postMessage.mock.calls[1][0];
      expect(secondCall.destination.x).toBe(500);
      expect(secondCall.destination.y).toBe(500);
    });
  });
});
