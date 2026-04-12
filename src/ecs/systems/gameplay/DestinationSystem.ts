import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { PHYSICS_CONFIG } from '@/config';
import { getEntityType } from '@/utils';

interface RecruitmentState {
  lodge: Entity;
  candidates: Map<string, Entity>;
  results: { entity: Entity; distance: number }[];
  pendingCount: number;
}

export class DestinationSystem implements GameSystem {
  private movers: Query<With<Entity, 'position' | 'velocity' | 'path'>>;
  private lodges: Query<With<Entity, 'lodge' | 'position' | 'destination'>>;
  private goals: Query<With<Entity, 'position' | 'destination' | 'goalTag'>>;
  private worker: Worker;

  private requestCounter = 0;
  private pendingRequests = new Map<string, { timeout: ReturnType<typeof setTimeout>; callback: (data: any) => void }>();
  private navigationRequestForEntity = new Map<number, string>();
  private activeRecruitments = new Map<number, RecruitmentState>();

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.movers = world.with('position', 'velocity', 'path');
    this.lodges = world.with('lodge', 'position', 'destination');
    this.goals = world.with('position', 'destination', 'goalTag');
    this.worker = config.worker;

    this.worker.onmessage = (event: MessageEvent) => {
      if (event.data.action === 'navmeshReady') return;

      if (event.data.action === 'error') {
        console.error('[DestinationSystem] Worker error:', event.data.error);
        const { requestId } = event.data;
        if (requestId) {
          this.handleRequestResponse(requestId, null, event.data);
        }
        return;
      }

      const { requestId, entityId, path, pathType } = event.data;
      if (requestId) {
        this.handleRequestResponse(requestId, path, event.data);
      }
    };

    this.worker.onerror = (error: ErrorEvent) => {
      console.error('[DestinationSystem] Worker error:', error.message);
    };
  }

  destroy(): void {
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
    this.navigationRequestForEntity.clear();
    this.activeRecruitments.clear();
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
    }
  }

  update(_delta: number, _time: number): void {
    this.recruitForLodges();
    this.navigateMovers();
  }

  private recruitForLodges(): void {
    for (const lodge of this.lodges) {
      const lodgeId = this.world.id(lodge);
      if (lodgeId === undefined) continue;

      const incoming = lodge.lodge.incoming ? lodge.lodge.incoming.length : 0;
      if (lodge.lodge.tenants.length + incoming >= lodge.lodge.maxTenants) continue;
      if (this.activeRecruitments.has(lodgeId)) continue;

      const tenantTypes = lodge.lodge.allowedTenants;
      const goal = this.findGoalForType(tenantTypes as string[]);
      if (!goal) continue;

      const candidates: Entity[] = [];
      for (const mover of this.movers) {
        const entityType = getEntityType(mover);
        if (!entityType || !(tenantTypes as string[]).includes(entityType)) continue;
        if (mover.fleeingToGoalTag) continue;
        if (mover.assignedDestination) continue;
        candidates.push(mover);
      }

      if (candidates.length === 0) continue;

      const recruitment: RecruitmentState = {
        lodge,
        candidates: new Map(),
        results: [],
        pendingCount: candidates.length
      };
      this.activeRecruitments.set(lodgeId, recruitment);

      for (const candidate of candidates) {
        const requestId = this.generateRequestId();
        recruitment.candidates.set(requestId, candidate);
        this.fireScoringRequest(requestId, candidate, lodge);
      }
    }
  }

  private navigateMovers(): void {
    for (const mover of this.movers) {
      try {
        const entityType = getEntityType(mover) || 'unknown';
        const entityId = this.world.id(mover);
        if (entityId === undefined) continue;
        if (!mover.path.currentPath) continue;

        const goal = this.findGoalForType([entityType]);
        if (!goal) continue;

        const isFleeing = !!mover.fleeingToGoalTag;
        const assigned = mover.assignedDestination;

        if (!mover.path.currentPath.length) {
          if (this.navigationRequestForEntity.has(entityId)) continue;

          let destination: { x: number; y: number };
          if (isFleeing) {
            destination = { x: goal.position.x, y: goal.position.y };
          } else if (assigned) {
            destination = { x: assigned.target.position!.x, y: assigned.target.position!.y };
          } else {
            destination = { x: goal.position.x, y: goal.position.y };
          }

          this.fireNavRequest(mover, { x: mover.position.x, y: mover.position.y }, destination, 'current');

        } else if (mover.path.goalPath && !mover.path.goalPath.length) {
          if (this.navigationRequestForEntity.has(entityId)) continue;

          const lastPos = mover.path.currentPath[mover.path.currentPath.length - 1];

          if (isFleeing) {
            this.fireNavRequest(mover, lastPos, { x: goal.position.x, y: goal.position.y }, 'next');
          } else if (assigned) {
            this.fireNavRequest(mover, { x: assigned.target.position!.x, y: assigned.target.position!.y }, { x: goal.position.x, y: goal.position.y }, 'next');
          } else {
            this.fireNavRequest(mover, lastPos, { x: goal.position.x, y: goal.position.y }, 'next');
          }
        }
      } catch (error) {
        console.error('[DestinationSystem] Error processing entity:', error);
      }
    }
  }

  private findGoalForType(types: string[]): With<Entity, 'position' | 'destination' | 'goalTag'> | null {
    for (const goal of this.goals) {
      for (const t of types) {
        if (goal.destination.for.includes(t)) return goal;
      }
    }
    return null;
  }

  private generateRequestId(): string {
    return `req-${++this.requestCounter}`;
  }

  private fireScoringRequest(requestId: string, candidate: Entity, lodge: Entity): void {
    const entityId = this.world.id(candidate);
    const radius = candidate.renderable?.radius ?? 0;

    const timeout = setTimeout(() => {
      this.handleScoringTimeout(requestId);
    }, 3000);

    this.pendingRequests.set(requestId, {
      timeout,
      callback: () => {}
    });

    this.worker.postMessage({
      action: 'pathfind',
      requestId,
      entityId,
      start: { x: candidate.position!.x, y: candidate.position!.y },
      destination: { x: lodge.position!.x, y: lodge.position!.y },
      pathType: 'score',
      radius,
      wallBufferMultiplier: PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER
    });
  }

  private fireNavRequest(
    entity: Entity,
    start: { x: number; y: number },
    destination: { x: number; y: number },
    pathType: string
  ): void {
    const entityId = this.world.id(entity);
    if (entityId === undefined) return;
    const radius = entity.renderable?.radius ?? 0;
    const requestId = this.generateRequestId();

    this.navigationRequestForEntity.set(entityId, requestId);

    const timeout = setTimeout(() => {
      console.warn('[DestinationSystem] Navigation request timeout for entity', entityId);
      this.pendingRequests.delete(requestId);
      this.navigationRequestForEntity.delete(entityId);
    }, 5000);

    this.pendingRequests.set(requestId, {
      timeout,
      callback: () => {}
    });

    this.worker.postMessage({
      action: 'pathfind',
      requestId,
      entityId,
      start: { x: start.x, y: start.y },
      destination: { x: destination.x, y: destination.y },
      pathType,
      radius,
      wallBufferMultiplier: PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER
    });
  }

  private handleRequestResponse(requestId: string, path: any[] | null, data: any): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
    }

    // Check if this is a scoring request
    for (const [lodgeId, recruitment] of this.activeRecruitments) {
      if (recruitment.candidates.has(requestId)) {
        this.handleScoringResponse(lodgeId, recruitment, requestId, path);
        return;
      }
    }

    // Otherwise it's a navigation request
    const { entityId, pathType } = data;
    if (entityId === undefined) return;

    const currentNavRequest = this.navigationRequestForEntity.get(entityId);
    if (currentNavRequest !== requestId) return;

    this.navigationRequestForEntity.delete(entityId);

    const entity = this.world.entity(entityId);
    if (!entity || !entity.path) return;

    if (path) {
      switch (pathType) {
        case 'current':
          entity.path.currentPath = path;
          break;
        case 'next':
          entity.path.goalPath = path;
          break;
      }
    }
  }

  private handleScoringResponse(
    lodgeId: number,
    recruitment: RecruitmentState,
    requestId: string,
    path: any[] | null
  ): void {
    const candidate = recruitment.candidates.get(requestId)!;
    recruitment.pendingCount--;

    if (path && path.length > 0) {
      const distance = this.computePathLength(path);
      recruitment.results.push({ entity: candidate, distance });
    }

    if (recruitment.pendingCount <= 0) {
      this.finalizeRecruitment(lodgeId, recruitment);
    }
  }

  private handleScoringTimeout(requestId: string): void {
    this.pendingRequests.delete(requestId);

    for (const [lodgeId, recruitment] of this.activeRecruitments) {
      if (recruitment.candidates.has(requestId)) {
        recruitment.pendingCount--;
        if (recruitment.pendingCount <= 0) {
          this.finalizeRecruitment(lodgeId, recruitment);
        }
        return;
      }
    }
  }

  private finalizeRecruitment(lodgeId: number, recruitment: RecruitmentState): void {
    this.activeRecruitments.delete(lodgeId);

    if (recruitment.results.length === 0) return;

    const lodge = recruitment.lodge;
    const goal = this.findGoalForType(lodge.lodge!.allowedTenants as string[]);

    // Apply backtracking penalty
    if (goal) {
      for (const result of recruitment.results) {
        if (!result.entity.position) continue;
        const toLodgeX = lodge.position!.x - result.entity.position.x;
        const toLodgeY = lodge.position!.y - result.entity.position.y;
        const toGoalX = goal.position.x - result.entity.position.x;
        const toGoalY = goal.position.y - result.entity.position.y;
        const dot = toLodgeX * toGoalX + toLodgeY * toGoalY;
        if (dot < 0) {
          result.distance /= PHYSICS_CONFIG.BACKTRACKING_DISCOUNT;
        }
      }
    }

    recruitment.results.sort((a, b) => a.distance - b.distance);

    for (const { entity } of recruitment.results) {
      if (!this.world.has(entity)) continue;
      if (entity.assignedDestination) continue;
      if (entity.fleeingToGoalTag) continue;
      if (entity.health?.isDead) continue;

      lodge.lodge!.incoming.push(entity);
      this.world.addComponent(entity, 'assignedDestination', { target: lodge });

      // Clear paths so navigation picks up the new assignment
      if (entity.path) {
        entity.path.currentPath = [];
        entity.path.goalPath = [];
      }

      // Cancel any pending nav request for this entity
      const entityId = this.world.id(entity);
      if (entityId !== undefined) {
        const navReqId = this.navigationRequestForEntity.get(entityId);
        if (navReqId) {
          const pending = this.pendingRequests.get(navReqId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(navReqId);
          }
          this.navigationRequestForEntity.delete(entityId);
        }
      }

      break;
    }
  }

  private computePathLength(path: { x: number; y: number }[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    }
    return total;
  }
}
