import type { GameWorld } from '@/ecs/Entity';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { clearPath } from '@/utils';

export interface PathRequest {
  start: { x: number; y: number };
  destination: { x: number; y: number };
  entityId?: number;
  radius: number;
  pathType: string;
}

export type PathCallback = (path: { x: number; y: number }[] | null, data: any) => void;

export class PathfindingService {
  private requestCounter = 0;
  private pendingRequests = new Map<string, { timeout: ReturnType<typeof setTimeout>; callback: PathCallback }>();

  constructor(private worker: Worker, private world: GameWorld) {
    this.worker.onmessage = (event: MessageEvent) => {
      if (event.data.action === 'navmeshReady') return;

      if (event.data.action === 'navmeshUpdated') {
        this.clearAllPaths();
        this.clearAllWallAttackTargets();
        gameEvents.emit(GameEvents.NAVMESH_UPDATED, {});
        return;
      }

      if (event.data.action === 'error') {
        console.error('[PathfindingService] Worker error:', event.data.error);
        const { requestId } = event.data;
        if (requestId) {
          this.handleResponse(requestId, null, event.data);
        }
        return;
      }

      const { requestId, path } = event.data;
      if (requestId) {
        this.handleResponse(requestId, path, event.data);
      }
    };

    this.worker.onerror = (error: ErrorEvent) => {
      console.error('[PathfindingService] Worker error:', error.message);
    };
  }

  requestPath(request: PathRequest, callback: PathCallback, timeoutMs = 5000): string {
    const requestId = `req-${++this.requestCounter}`;

    const timeout = setTimeout(() => {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        this.pendingRequests.delete(requestId);
        pending.callback(null, { requestId, timedOut: true });
      }
    }, timeoutMs);

    this.pendingRequests.set(requestId, { timeout, callback });

    this.worker.postMessage({
      action: 'pathfind',
      requestId,
      entityId: request.entityId,
      start: { x: request.start.x, y: request.start.y },
      destination: { x: request.destination.x, y: request.destination.y },
      pathType: request.pathType,
      radius: request.radius,
      wallBufferMultiplier: PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER
    });

    return requestId;
  }

  cancelRequest(requestId: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
    }
  }

  private handleResponse(requestId: string, path: any[] | null, data: any): void {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);
    pending.callback(path, data);
  }

  private clearAllPaths(): void {
    const movers = this.world.with('position', 'velocity', 'path');
    for (const mover of movers) {
      clearPath(mover);
    }
  }

  private clearAllWallAttackTargets(): void {
    for (const entity of this.world.with('wallAttackTarget')) {
      this.world.removeComponent(entity, 'wallAttackTarget');
    }
  }

  destroy(): void {
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
    }
  }
}
