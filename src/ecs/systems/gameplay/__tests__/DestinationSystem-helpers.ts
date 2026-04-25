import { vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DestinationSystem } from '../DestinationSystem';
import { PathfindingService } from '../PathfindingService';
import { gameEvents } from '@/events';
import { createMockWorker } from '@/__tests__/helpers';

export function createDestinationTestSetup() {
  const world: GameWorld = new World<Entity>();
  const mockWorker = createMockWorker();
  const pathfinding = new PathfindingService(mockWorker, world);
  gameEvents.clear();

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

  return {
    world,
    mockWorker,
    pathfinding,
    getPostMessages,
    getPostMessagesByType,
    simulateWorkerResponse,
    simulateNavResponse,
  };
}

export type DestinationTestSetup = ReturnType<typeof createDestinationTestSetup>;
