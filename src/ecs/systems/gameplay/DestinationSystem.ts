import { System } from 'ecsy';
import { Position, Velocity, Path, Destination, Renderable } from '@/ecs/components';
import { FireflyTag, MonsterTag, WispTag, GoalTag } from '@/ecs/components';
import { ECSEntity } from '@/types';

interface PathfindingWorker extends Worker {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
}

interface DestinationCandidate {
  entity: ECSEntity;
  pos: Position;
  score: number;
  pathProximityFactor: number;
  progressPercent: number;
}

export class DestinationSystem extends System {
  private worker!: PathfindingWorker;
  private pendingRequests = new Set<number>();

  constructor(world: any, attributes?: any) {
    super(world, attributes);
  }

  init(attributes?: any): void {
    if (attributes?.worker) {
      this.worker = attributes.worker;
      this.worker.onmessage = (event) => {
        if (event.data.action === 'navmeshReady') {
          return;
        }

        if (event.data.action === 'error') {
          console.error('[DestinationSystem] Worker error:', event.data.error);
          return;
        }

        const { entityId, path, pathType } = event.data;

        if (entityId !== undefined) {
          this.pendingRequests.delete(entityId);

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
  }

  execute(_delta?: number, _time?: number): void {
    this.queries.needsDestination.results.forEach(entity => {
      const position = entity.getComponent(Position)!;
      const pathComp = entity.getMutableComponent(Path)!;
      const entityType = this.getEntityType(entity);

      if (!pathComp.currentPath) {
        return;
      }

      const finalDestination = this.findGoalDestination(entityType);

      if (!finalDestination) {
        return;
      }

      if (!pathComp.currentPath.length) {
        // Don't spam requests if we're already waiting for a response
        if (this.pendingRequests.has(entity.id)) {
          return;
        }

        const currentPos = { x: position.x, y: position.y };
        const destinations = this.gatherDestinations(currentPos, finalDestination, entityType, pathComp.direction);

        if (!destinations.length) {
          destinations.push(finalDestination);
        }

        this.pendingRequests.add(entity.id);
        this.requestPath(entity, currentPos, {
          x: destinations[0].pos.x,
          y: destinations[0].pos.y
        }, 'current');

        if (destinations.length < 1) {
          pathComp.nextPath = [];
        }
      } else if (pathComp.nextPath && !pathComp.nextPath.length) {
        const lastPos = pathComp.currentPath[pathComp.currentPath.length - 1];
        const destinations = this.gatherDestinations(lastPos, finalDestination, entityType, pathComp.direction);

        if (!destinations.length) {
          destinations.push(finalDestination);
        }

        this.requestPath(entity, lastPos, {
          x: destinations[0].pos.x,
          y: destinations[0].pos.y
        }, 'next');

        if (destinations.length < 1) {
          pathComp.nextPath = [];
        }
      }
    });
  }

  private getEntityType(entity: ECSEntity): string {
    if (entity.hasComponent(FireflyTag)) return 'firefly';
    if (entity.hasComponent(MonsterTag)) return 'monster';
    if (entity.hasComponent(WispTag)) return 'wisp';
    if (entity.hasComponent(GoalTag)) return 'goal';
    return 'unknown';
  }

  private findGoalDestination(entityType: string): DestinationCandidate | null {
    let goalDestination: DestinationCandidate | null = null;

    this.queries.destinations.results.forEach(destination => {
      const destComp = destination.getComponent(Destination)!;
      const destType = this.getEntityType(destination);
      const pos = destination.getComponent(Position)!;

      if (destComp.for.includes(entityType) && destType === 'goal') {
        goalDestination = {
          entity: destination,
          pos: pos,
          score: 0,
          pathProximityFactor: 0,
          progressPercent: 0
        };
      }
    });

    return goalDestination;
  }

  private gatherDestinations(
    current: { x: number; y: number },
    finalDest: DestinationCandidate,
    entityType: string,
    direction: string,
    minScoreThreshold: number = 1.0
  ): DestinationCandidate[] {
    const idealDX = finalDest.pos.x - current.x;
    const idealDY = finalDest.pos.y - current.y;
    const idealDist = Math.hypot(idealDX, idealDY);

    if (idealDist < 1) return [];

    const mainDir = {
      x: idealDX / idealDist,
      y: idealDY / idealDist
    };

    const candidates: DestinationCandidate[] = [];

    this.queries.destinations.results.forEach(entity => {
      const destComp = entity.getComponent(Destination)!;
      const typeComp = this.getEntityType(entity);
      const destPos = entity.getComponent(Position)!;

      if (typeComp === 'goal') return;
      if (!destComp.for.includes(entityType)) return;

      const distToDest = Math.hypot(destPos.x - current.x, destPos.y - current.y);
      if (distToDest < 1) return;

      const vx = destPos.x - current.x;
      const vy = destPos.y - current.y;
      const progress = vx * mainDir.x + vy * mainDir.y;

      if (progress <= 0) return;

      const projPoint = {
        x: current.x + progress * mainDir.x,
        y: current.y + progress * mainDir.y
      };

      const distanceFromPath = Math.hypot(destPos.x - projPoint.x, destPos.y - projPoint.y);
      const progressPercent = progress / idealDist;
      const pathProximityFactor = 1 / (distanceFromPath + 0.5);

      const PATH_WEIGHT = 3;
      const PROGRESS_WEIGHT = 0.1;
      let score = (progressPercent * PROGRESS_WEIGHT) + (pathProximityFactor * PATH_WEIGHT);

      if (typeComp === 'goal') {
        score = Math.max(score, minScoreThreshold);
      }

      if (score >= minScoreThreshold) {
        candidates.push({
          entity: entity,
          pos: destPos,
          score: score,
          pathProximityFactor: pathProximityFactor,
          progressPercent: progressPercent
        });
      }
    });

    const sortModifier = direction === 'r' ? 1 : -1;
    candidates.sort((a, b) => b.score - (a.score * sortModifier));
    return candidates;
  }

  private requestPath(
    entity: ECSEntity,
    start: { x: number; y: number },
    destination: { x: number; y: number },
    pathType: string
  ): void {
    const startPoint = { x: start.x, y: start.y };
    const endPoint = { x: destination.x, y: destination.y };

    let radius = 0;
    if (entity.hasComponent(Renderable)) {
      const renderComp = entity.getComponent(Renderable)!;
      radius = renderComp.radius;
    }

    this.worker.postMessage({
      action: 'pathfind',
      entityId: entity.id,
      start: startPoint,
      destination: endPoint,
      pathType,
      radius
    });
  }

  private applyPathToEntity(entity: ECSEntity, path: any[], pathType: string): void {
    if (entity.hasComponent(Path)) {
      const pathComp = entity.getMutableComponent(Path)!;
      switch (pathType) {
        case 'current':
          pathComp.currentPath = path;
          break;
        case 'next':
          pathComp.nextPath = path;
          break;
        default:
          console.error('Invalid path type:', pathType);
          break;
      }
    }
  }

  private findEntityById(id: number): ECSEntity | null {
    const results = [...this.queries.needsDestination.results, ...this.queries.destinations.results];
    return results.find(e => e.id === id) || null;
  }

  static queries = {
    needsDestination: {
      components: [Position, Velocity, Path],
      listen: {
        changed: [Path]
      }
    },
    destinations: {
      components: [Position, Destination]
    }
  };
}
