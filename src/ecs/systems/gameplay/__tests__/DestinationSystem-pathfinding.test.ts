import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DestinationSystem } from '../DestinationSystem';
import { PHYSICS_CONFIG } from '@/config';
import { createBasicTestSetup, createTestFirefly } from '@/__tests__/helpers';
import { createDestinationTestSetup, type DestinationTestSetup } from './DestinationSystem-helpers';

describe('DestinationSystem — pathfinding', () => {
  let t: DestinationTestSetup;
  let system: DestinationSystem;

  beforeEach(() => {
    t = createDestinationTestSetup();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with pathfinding service', () => {
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      expect((system as any).pathfinding).toBe(t.pathfinding);
    });
  });

  describe('Worker Message Handling', () => {
    it('should handle navmeshReady message', () => {
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      expect(() => t.simulateWorkerResponse({ action: 'navmeshReady' })).not.toThrow();
    });

    it('should handle worker error messages', () => {
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      t.simulateWorkerResponse({
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
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });

      expect(() => {
        t.simulateNavResponse('req-999', 999, [{ x: 100, y: 100 }], 'current');
      }).not.toThrow();
    });
  });

  describe('Path requests and responses', () => {
    it('should request path to goal for unassigned entity with no current path', () => {
      createBasicTestSetup(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'current' || m.pathType === 'next'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].pathType).toBe('current');
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });

    it('should not send navigation request when one is already pending', () => {
      createBasicTestSetup(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });

      system.update(16, 16);
      system.update(16, 16);
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBe(1);
    });

    it('should apply current path from navigation response', () => {
      const { entity } = createBasicTestSetup(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMsg = t.getPostMessages().find((m: any) => m.pathType === 'current');
      t.simulateNavResponse(navMsg.requestId, t.world.id(entity)!, [
        { x: 150, y: 150 }, { x: 500, y: 500 }
      ], 'current');

      expect(entity.path!.currentPath).toEqual([
        { x: 150, y: 150 }, { x: 500, y: 500 }
      ]);
    });

    it('should apply goalPath from navigation response', () => {
      const { entity } = createBasicTestSetup(t.world, {
        currentPath: [{ x: 200, y: 200 }]
      });
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMsg = t.getPostMessages().find((m: any) => m.pathType === 'next');
      if (navMsg) {
        t.simulateNavResponse(navMsg.requestId, t.world.id(entity)!, [
          { x: 300, y: 300 }, { x: 500, y: 500 }
        ], 'next');

        expect(entity.path!.goalPath).toEqual([
          { x: 300, y: 300 }, { x: 500, y: 500 }
        ]);
      }
    });

    it('should discard stale navigation response', () => {
      const { entity } = createBasicTestSetup(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const firstNavMsg = t.getPostMessages().find((m: any) => m.pathType === 'current');
      const staleRequestId = firstNavMsg.requestId;

      t.simulateWorkerResponse({
        action: 'error',
        error: 'timeout',
        entityId: t.world.id(entity),
        requestId: staleRequestId
      });

      system.update(16, 16);

      t.simulateNavResponse(staleRequestId, t.world.id(entity)!, [
        { x: 999, y: 999 }
      ], 'current');

      expect(entity.path!.currentPath).not.toEqual([{ x: 999, y: 999 }]);
    });

    it('should include entity radius in navigation request', () => {
      createBasicTestSetup(t.world, { radius: 15 });
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMsg = t.getPostMessages().find((m: any) => m.pathType === 'current');
      expect(navMsg.radius).toBe(15);
      expect(navMsg.wallBufferMultiplier).toBe(PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER);
    });

    it('should not request paths when no goal exists', () => {
      createTestFirefly(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      expect(t.mockWorker.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup pending requests on destroy', () => {
      vi.useFakeTimers();

      createBasicTestSetup(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      system.destroy!();

      expect((system as any).navigationRequestForEntity.size).toBe(0);

      vi.useRealTimers();
    });

    it('should clear pending request on successful path response', () => {
      vi.useFakeTimers();

      const { entity } = createBasicTestSetup(t.world);
      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMsg = t.getPostMessages().find((m: any) => m.pathType === 'current');
      t.simulateNavResponse(navMsg.requestId, t.world.id(entity)!, [
        { x: 200, y: 200 }
      ], 'current');

      system.update(16, 16);
      const nextCount = t.getPostMessages().filter((m: any) => m.pathType === 'next').length;
      expect(nextCount).toBe(1);

      vi.useRealTimers();
    });
  });
});
