import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'ecsy';
import { DestinationSystem } from '../DestinationSystem';
import {
  Position,
  Velocity,
  Path,
  Destination,
  Renderable,
  FireflyTag,
  MonsterTag,
  WispTag,
  GoalTag
} from '@/ecs/components';
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
  let world: World;
  let mockWorker: any;

  beforeEach(() => {
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Velocity)
      .registerComponent(Path)
      .registerComponent(Destination)
      .registerComponent(Renderable)
      .registerComponent(FireflyTag)
      .registerComponent(MonsterTag)
      .registerComponent(WispTag)
      .registerComponent(GoalTag);

    mockWorker = createMockWorker();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with worker', () => {
      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      expect(system.worker).toBe(mockWorker);
    });

    it('should setup worker message handler', () => {
      world.registerSystem(DestinationSystem, { worker: mockWorker });

      expect(mockWorker.onmessage).toBeDefined();
      expect(typeof mockWorker.onmessage).toBe('function');
    });

    it('should setup worker error handler', () => {
      world.registerSystem(DestinationSystem, { worker: mockWorker });

      expect(mockWorker.onerror).toBeDefined();
      expect(typeof mockWorker.onerror).toBe('function');
    });
  });

  describe('Entity Type Detection', () => {
    it('should detect firefly entities', () => {
      const entity = createTestFirefly(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      expect(system.getEntityType(entity)).toBe('firefly');
    });

    it('should detect monster entities', () => {
      const entity = createTestMonster(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      expect(system.getEntityType(entity)).toBe('monster');
    });

    it('should detect wisp entities', () => {
      const entity = createTestWisp(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      expect(system.getEntityType(entity)).toBe('wisp');
    });

    it('should detect goal entities', () => {
      const entity = createTestGoal(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      expect(system.getEntityType(entity)).toBe('goal');
    });

    it('should return unknown for untagged entities', () => {
      const entity = world.createEntity();

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      expect(system.getEntityType(entity)).toBe('unknown');
    });
  });

  describe('Path Requests', () => {
    it('should request path when entity has no current path', () => {
      const { entity } = createBasicTestSetup(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalled();
      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.action).toBe('pathfind');
      expect(call.entityId).toBe(entity.id);
      expect(call.pathType).toBe('current');
    });

    it('should not spam requests when already waiting for response', () => {
      createBasicTestSetup(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);
      world.execute(16, 16);
      world.execute(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    });

    it('should request next path when current path exists but next path is empty', () => {
      const { entity } = createBasicTestSetup(world, {
        currentPath: [{ x: 200, y: 200 }]
      });

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      expect(mockWorker.postMessage).toHaveBeenCalled();
      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.action).toBe('pathfind');
      expect(call.pathType).toBe('next');
      expect(call.start).toEqual({ x: 200, y: 200 });
    });

    it('should include entity radius in path request', () => {
      const { entity } = createBasicTestSetup(world, { radius: 15 });

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.radius).toBe(15);
      expect(call.wallBufferMultiplier).toBe(PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER);
    });

    it('should use radius 0 if entity has no Renderable component', () => {
      const entity = world.createEntity();
      entity.addComponent(Position, { x: 100, y: 100 });
      entity.addComponent(Velocity, { vx: 0, vy: 0 });
      entity.addComponent(Path, {
        currentPath: [],
        nextPath: [],
        direction: 'r'
      });
      entity.addComponent(FireflyTag);

      createTestGoal(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      const call = mockWorker.postMessage.mock.calls[0][0];
      expect(call.radius).toBe(0);
    });
  });

  describe('Worker Message Handling', () => {
    it('should handle navmeshReady message', () => {
      world.registerSystem(DestinationSystem, { worker: mockWorker });

      const event = {
        data: { action: 'navmeshReady' }
      };

      expect(() => mockWorker.onmessage(event)).not.toThrow();
    });

    it('should apply path to entity when receiving pathfinding result', () => {
      const { entity } = createBasicTestSetup(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      const newPath = [
        { x: 150, y: 150 },
        { x: 200, y: 200 },
        { x: 250, y: 250 }
      ];

      mockWorker.onmessage({
        data: {
          entityId: entity.id,
          path: newPath,
          pathType: 'current'
        }
      });

      const pathComp = entity.getComponent(Path)!;
      expect(pathComp.currentPath).toEqual(newPath);
    });

    it('should apply next path when pathType is next', () => {
      const { entity } = createBasicTestSetup(world, {
        currentPath: [{ x: 200, y: 200 }]
      });

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      const newPath = [
        { x: 300, y: 300 },
        { x: 400, y: 400 }
      ];

      mockWorker.onmessage({
        data: {
          entityId: entity.id,
          path: newPath,
          pathType: 'next'
        }
      });

      const pathComp = entity.getComponent(Path)!;
      expect(pathComp.nextPath).toEqual(newPath);
      expect(pathComp.currentPath).toEqual([{ x: 200, y: 200 }]);
    });

    it('should handle worker error messages', () => {
      world.registerSystem(DestinationSystem, { worker: mockWorker });
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
      world.registerSystem(DestinationSystem, { worker: mockWorker });

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

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      expect(goalDest).not.toBeNull();
    });

    it('should return null when no goal exists for entity type', () => {
      createTestFirefly(world);
      createTestGoal(world, { for: ['monster'] });

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      expect(goalDest).toBeNull();
    });

    it('should gather intermediate destinations', () => {
      createTestFirefly(world);
      const wisp = createTestWisp(world);
      createTestGoal(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      const destinations = system.gatherDestinations(
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

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      const destinations = system.gatherDestinations(
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

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      const destinations = system.gatherDestinations(
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

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      const destinations = system.gatherDestinations(
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

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      const system = world.getSystem(DestinationSystem) as any;

      const goalDest = system.findGoalDestination('firefly');
      const destinations = system.gatherDestinations(
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

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      mockWorker.onmessage({
        data: {
          entityId: entity.id,
          path: [{ x: 200, y: 200 }],
          pathType: 'current'
        }
      });

      world.execute(16, 16);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should clear pending request on worker error', () => {
      vi.useFakeTimers();

      const { entity } = createBasicTestSetup(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWorker.onmessage({
        data: {
          action: 'error',
          error: 'Pathfinding failed',
          entityId: entity.id
        }
      });
      consoleSpy.mockRestore();

      world.execute(16, 16);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should cleanup pending requests on stop', () => {
      vi.useFakeTimers();

      createBasicTestSetup(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      const system = world.getSystem(DestinationSystem) as any;
      expect(system.pendingRequests.size).toBe(1);

      system.stop();
      expect(system.pendingRequests.size).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should not request path when no goal exists', () => {
      createTestFirefly(world);

      world.registerSystem(DestinationSystem, { worker: mockWorker });
      world.execute(16, 16);

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });
});
