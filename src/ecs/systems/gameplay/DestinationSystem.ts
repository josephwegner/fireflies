import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { PHYSICS_CONFIG } from '@/config';
import { getEntityType } from '@/utils';

interface DestinationCandidate {
  entity: Entity;
  pos: { x: number; y: number };
  score: number;
  pathProximityFactor: number;
  progressPercent: number;
}

export class DestinationSystem implements GameSystem {
  private needsDestination: Query<With<Entity, 'position' | 'velocity' | 'path'>>;
  private destinations: Query<With<Entity, 'position' | 'destination'>>;
  private worker: Worker;
  private pendingRequests = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.needsDestination = world.with('position', 'velocity', 'path');
    this.destinations = world.with('position', 'destination');
    this.worker = config.worker;

    this.needsDestination.onEntityRemoved.subscribe((entity) => {
      const entityId = this.world.id(entity);
      if (entityId !== undefined) {
        this.clearPendingRequest(entityId);
      }
    });

    this.worker.onmessage = (event: MessageEvent) => {
      if (event.data.action === 'navmeshReady') return;

      if (event.data.action === 'error') {
        console.error('[DestinationSystem] Worker error:', event.data.error);
        if (event.data.entityId !== undefined) {
          this.clearPendingRequest(event.data.entityId);
        }
        return;
      }

      const { entityId, path, pathType } = event.data;
      if (entityId !== undefined) {
        this.clearPendingRequest(entityId);
        const entity = this.findEntityById(entityId);
        if (entity) {
          this.applyPathToEntity(entity, path, pathType);
        }
      }
    };

    this.worker.onerror = (error: ErrorEvent) => {
      console.error('[DestinationSystem] Worker error:', error.message);
    };
  }

  destroy(): void {
    this.pendingRequests.forEach((timeout) => clearTimeout(timeout));
    this.pendingRequests.clear();
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
    }
  }

  update(_delta: number, _time: number): void {
    for (const entity of this.needsDestination) {
      try {
        const { position, path: pathComp } = entity;
        const entityType = getEntityType(entity) || 'unknown';
        const entityId = this.world.id(entity);
        if (entityId === undefined) continue;

        if (!pathComp.currentPath) continue;

        const finalDestination = this.findGoalDestination(entityType);
        if (!finalDestination) continue;

        const isFleeing = !!entity.fleeingToGoalTag;

        if (!pathComp.currentPath.length) {
          if (this.pendingRequests.has(entityId)) continue;

          const currentPos = { x: position.x, y: position.y };
          let destinations: DestinationCandidate[] = [];
          if (!isFleeing) {
            destinations = this.gatherDestinations(currentPos, finalDestination, entityType, pathComp.direction);
          }
          if (!destinations.length) destinations.push(finalDestination);

          this.addPendingRequest(entityId);
          this.requestPath(entity, currentPos, { x: destinations[0].pos.x, y: destinations[0].pos.y }, 'current');

          if (destinations.length < 1) pathComp.nextPath = [];

        } else if (pathComp.nextPath && !pathComp.nextPath.length) {
          const lastPos = pathComp.currentPath[pathComp.currentPath.length - 1];

          let destinations: DestinationCandidate[] = [];
          if (!isFleeing) {
            destinations = this.gatherDestinations(lastPos, finalDestination, entityType, pathComp.direction);
          }
          if (!destinations.length) destinations.push(finalDestination);

          this.requestPath(entity, lastPos, { x: destinations[0].pos.x, y: destinations[0].pos.y }, 'next');

          if (destinations.length < 1) pathComp.nextPath = [];
        }
      } catch (error) {
        console.error('[DestinationSystem] Error processing entity:', error);
        const entityId = this.world.id(entity);
        if (entityId !== undefined) this.clearPendingRequest(entityId);
      }
    }
  }

  private clearPendingRequest(entityId: number): void {
    const timeout = this.pendingRequests.get(entityId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingRequests.delete(entityId);
    }
  }

  private addPendingRequest(entityId: number): void {
    this.clearPendingRequest(entityId);
    const timeout = setTimeout(() => {
      console.warn('[DestinationSystem] Pathfinding request timeout for entity', entityId);
      this.pendingRequests.delete(entityId);
    }, 5000);
    this.pendingRequests.set(entityId, timeout);
  }

  private findGoalDestination(entityType: string): DestinationCandidate | null {
    for (const dest of this.destinations) {
      if (dest.destination.for.includes(entityType) && dest.goalTag) {
        return {
          entity: dest,
          pos: dest.position,
          score: 0,
          pathProximityFactor: 0,
          progressPercent: 0
        };
      }
    }
    return null;
  }

  private gatherDestinations(
    current: { x: number; y: number },
    finalDest: DestinationCandidate,
    entityType: string,
    direction: string,
    minScoreThreshold: number = PHYSICS_CONFIG.MIN_SCORE_THRESHOLD
  ): DestinationCandidate[] {
    const idealDX = finalDest.pos.x - current.x;
    const idealDY = finalDest.pos.y - current.y;
    const idealDist = Math.hypot(idealDX, idealDY);

    if (idealDist < 1) return [];

    const mainDir = { x: idealDX / idealDist, y: idealDY / idealDist };
    const candidates: DestinationCandidate[] = [];

    for (const entity of this.destinations) {
      if (entity.goalTag) continue;
      if (!entity.destination.for.includes(entityType)) continue;

      const destPos = entity.position;
      const distToDest = Math.hypot(destPos.x - current.x, destPos.y - current.y);
      if (distToDest < 1) continue;

      const vx = destPos.x - current.x;
      const vy = destPos.y - current.y;
      const progress = vx * mainDir.x + vy * mainDir.y;
      if (progress <= 0) continue;

      const projPoint = {
        x: current.x + progress * mainDir.x,
        y: current.y + progress * mainDir.y
      };

      const distanceFromPath = Math.hypot(destPos.x - projPoint.x, destPos.y - projPoint.y);
      const progressPercent = progress / idealDist;
      const pathProximityFactor = 1 / (distanceFromPath + 0.5);

      const score = (progressPercent * PHYSICS_CONFIG.PROGRESS_WEIGHT) + (pathProximityFactor * PHYSICS_CONFIG.PATH_PROXIMITY_WEIGHT);

      if (score >= minScoreThreshold) {
        candidates.push({ entity, pos: destPos, score, pathProximityFactor, progressPercent });
      }
    }

    const sortModifier = direction === 'r' ? 1 : -1;
    candidates.sort((a, b) => b.score - (a.score * sortModifier));
    return candidates;
  }

  private requestPath(
    entity: Entity,
    start: { x: number; y: number },
    destination: { x: number; y: number },
    pathType: string
  ): void {
    const entityId = this.world.id(entity);
    const radius = entity.renderable?.radius ?? 0;

    this.worker.postMessage({
      action: 'pathfind',
      entityId,
      start: { x: start.x, y: start.y },
      destination: { x: destination.x, y: destination.y },
      pathType,
      radius,
      wallBufferMultiplier: PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER
    });
  }

  private applyPathToEntity(entity: Entity, path: any[], pathType: string): void {
    if (!entity.path) return;
    switch (pathType) {
      case 'current':
        entity.path.currentPath = path;
        break;
      case 'next':
        entity.path.nextPath = path;
        break;
    }
  }

  private findEntityById(id: number): Entity | null {
    return this.world.entity(id) ?? null;
  }
}
