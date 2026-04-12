import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../pathfinding', () => ({
  pathfind: vi.fn()
}));

vi.mock('../navmesh', () => ({
  wallsToPaths: vi.fn(),
  shrinkPaths: vi.fn(),
  generateNavMesh: vi.fn()
}));

import { pathfind } from '../pathfinding';
import { wallsToPaths, shrinkPaths, generateNavMesh } from '../navmesh';

const mockPathfind = vi.mocked(pathfind);
const mockWallsToPaths = vi.mocked(wallsToPaths);
const mockShrinkPaths = vi.mocked(shrinkPaths);
const mockGenerateNavMesh = vi.mocked(generateNavMesh);

let handler: (e: MessageEvent) => void;
const mockPostMessage = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (globalThis as any).self = {
    postMessage: mockPostMessage,
    set onmessage(fn: any) {
      handler = fn;
    },
    get onmessage() {
      return handler;
    }
  };
});

async function loadWorker() {
  vi.resetModules();

  vi.doMock('../pathfinding', () => ({ pathfind: mockPathfind }));
  vi.doMock('../navmesh', () => ({
    wallsToPaths: mockWallsToPaths,
    shrinkPaths: mockShrinkPaths,
    generateNavMesh: mockGenerateNavMesh
  }));

  await import('../worker');
}

function fireMessage(data: any) {
  handler({ data } as MessageEvent);
}

describe('Worker message handler', () => {
  describe('buildNavMesh', () => {
    it('should build navmesh and respond with navmeshReady', async () => {
      const fakePaths = [[{ x: 0, y: 0 }, { x: 100, y: 100 }]];
      mockWallsToPaths.mockReturnValue(fakePaths);

      await loadWorker();
      fireMessage({ action: 'buildNavMesh', walls: [[{ x: 0, y: 0 }]] });

      expect(mockWallsToPaths).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalledWith({
        action: 'navmeshReady',
        pathCount: 1
      });
    });
  });

  describe('pathfind — silent failure fixes', () => {
    it('should send error response with requestId when navmesh not built', async () => {
      await loadWorker();

      fireMessage({
        action: 'pathfind',
        requestId: 'req-1',
        entityId: 42,
        start: { x: 0, y: 0 },
        destination: { x: 100, y: 100 },
        pathType: 'current',
        radius: 5,
        wallBufferMultiplier: 1.5
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          entityId: 42,
          requestId: 'req-1'
        })
      );
      expect(mockPostMessage.mock.calls[0][0].error).toMatch(/navmesh/i);
    });

    it('should send error response with requestId when navmesh generation fails', async () => {
      mockWallsToPaths.mockReturnValue([[{ x: 0, y: 0 }]]);
      mockShrinkPaths.mockReturnValue([]);
      mockGenerateNavMesh.mockReturnValue(null as any);

      await loadWorker();

      fireMessage({ action: 'buildNavMesh', walls: [] });
      mockPostMessage.mockClear();

      fireMessage({
        action: 'pathfind',
        requestId: 'req-2',
        entityId: 7,
        start: { x: 0, y: 0 },
        destination: { x: 100, y: 100 },
        pathType: 'score',
        radius: 10,
        wallBufferMultiplier: 1.5
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          entityId: 7,
          requestId: 'req-2'
        })
      );
      expect(mockPostMessage.mock.calls[0][0].error).toMatch(/navmesh/i);
    });

    it('should send error response with requestId when pathfinding returns null', async () => {
      const fakePaths = [[{ x: 0, y: 0 }]];
      const fakeNavMesh = { findPath: vi.fn() };
      mockWallsToPaths.mockReturnValue(fakePaths);
      mockShrinkPaths.mockReturnValue(fakePaths);
      mockGenerateNavMesh.mockReturnValue(fakeNavMesh as any);
      mockPathfind.mockReturnValue(null);

      await loadWorker();

      fireMessage({ action: 'buildNavMesh', walls: [] });
      mockPostMessage.mockClear();

      fireMessage({
        action: 'pathfind',
        requestId: 'req-3',
        entityId: 99,
        start: { x: 0, y: 0 },
        destination: { x: 100, y: 100 },
        pathType: 'current',
        radius: 5,
        wallBufferMultiplier: 1.5
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          entityId: 99,
          requestId: 'req-3'
        })
      );
      expect(mockPostMessage.mock.calls[0][0].error).toMatch(/no path found/i);
    });
  });

  describe('pathfind — success response', () => {
    it('should include requestId in successful path response', async () => {
      const fakePaths = [[{ x: 0, y: 0 }]];
      const fakeNavMesh = { findPath: vi.fn() };
      mockWallsToPaths.mockReturnValue(fakePaths);
      mockShrinkPaths.mockReturnValue(fakePaths);
      mockGenerateNavMesh.mockReturnValue(fakeNavMesh as any);
      mockPathfind.mockReturnValue([{ x: 0, y: 0 }, { x: 50, y: 50 }]);

      await loadWorker();

      fireMessage({ action: 'buildNavMesh', walls: [] });
      mockPostMessage.mockClear();

      fireMessage({
        action: 'pathfind',
        requestId: 'req-4',
        entityId: 10,
        start: { x: 0, y: 0 },
        destination: { x: 50, y: 50 },
        pathType: 'current',
        radius: 5,
        wallBufferMultiplier: 1.5
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-4',
          entityId: 10,
          pathType: 'current',
          path: [{ x: 0, y: 0 }, { x: 50, y: 50 }]
        })
      );
    });
  });

  describe('catch block error response', () => {
    it('should include requestId in catch-block error response', async () => {
      const fakePaths = [[{ x: 0, y: 0 }]];
      mockWallsToPaths.mockReturnValue(fakePaths);
      mockShrinkPaths.mockImplementation(() => { throw new Error('shrink boom'); });

      await loadWorker();

      fireMessage({ action: 'buildNavMesh', walls: [] });
      mockPostMessage.mockClear();

      fireMessage({
        action: 'pathfind',
        requestId: 'req-5',
        entityId: 55,
        start: { x: 0, y: 0 },
        destination: { x: 100, y: 100 },
        pathType: 'score',
        radius: 5,
        wallBufferMultiplier: 1.5
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          entityId: 55,
          requestId: 'req-5'
        })
      );
    });
  });
});
