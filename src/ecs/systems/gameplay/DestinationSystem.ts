import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, Team } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { PHYSICS_CONFIG, GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';

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

      if (event.data.action === 'navmeshUpdated') {
        this.clearAllPaths();
        this.clearAllWallAttackTargets();
        gameEvents.emit(GameEvents.NAVMESH_UPDATED, {});
        return;
      }

      if (event.data.action === 'error') {
        console.error('[DestinationSystem] Worker error:', event.data.error);
        const { requestId, entityId } = event.data;
        if (requestId) {
          this.handleRequestResponse(requestId, null, event.data);
        }
        if (entityId !== undefined && event.data.error === 'no path found') {
          const entity = this.world.entity(entityId);
          if (entity?.monsterTag) {
            this.handleMonsterPathBlocked(entity);
          }
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

      const allowedTeam = lodge.lodge.allowedTeam;
      const goal = this.findGoalForTeam(allowedTeam);
      if (!goal) continue;

      const candidates: Entity[] = [];
      for (const mover of this.movers) {
        if (mover.team !== allowedTeam) continue;
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
        const entityId = this.world.id(mover);
        if (entityId === undefined) continue;
        if (!mover.path.currentPath) continue;
        if (!mover.team) continue;

        const goal = this.findGoalForTeam(mover.team);
        if (!goal) continue;

        const isFleeing = !!mover.fleeingToGoalTag;
        const assigned = mover.assignedDestination;

        // Owning system (e.g. BuildingSystem) sets holding = true when entity should stay put
        if (assigned?.holding) continue;

        if (!mover.path.currentPath.length) {
          if (mover.redirectTarget) {
            this.cancelNavigationRequest(entityId);
          } else if (this.navigationRequestForEntity.has(entityId)) {
            continue;
          }

          let destination: { x: number; y: number };
          if (mover.redirectTarget) {
            destination = { x: mover.redirectTarget.x, y: mover.redirectTarget.y };
            this.world.removeComponent(mover, 'redirectTarget');
          } else if (isFleeing) {
            destination = { x: goal.position.x, y: goal.position.y };
          } else if (assigned) {
            const targetPos = assigned.targetPosition ?? assigned.target.position!;
            destination = { x: targetPos.x, y: targetPos.y };
          } else if (mover.wallAttackTarget) {
            destination = this.wallApproachPoint(mover, mover.wallAttackTarget.wallEntity);
          } else {
            destination = { x: goal.position.x, y: goal.position.y };
          }

          this.fireNavRequest(mover, { x: mover.position.x, y: mover.position.y }, destination, 'current');

        } else if (mover.path.goalPath && !mover.path.goalPath.length) {
          if (this.navigationRequestForEntity.has(entityId)) continue;

          // Don't pre-compute a goal path for assigned entities or wall attackers
          if (assigned || mover.wallAttackTarget) continue;

          const lastPos = mover.path.currentPath[mover.path.currentPath.length - 1];
          this.fireNavRequest(mover, lastPos, { x: goal.position.x, y: goal.position.y }, 'next');
        }
      } catch (error) {
        console.error('[DestinationSystem] Error processing entity:', error);
      }
    }
  }

  private findGoalForTeam(team: Team): With<Entity, 'position' | 'destination' | 'goalTag'> | null {
    for (const goal of this.goals) {
      if (goal.destination.forTeam === team) return goal;
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

    const hasAssigned = !!entity.assignedDestination;
    const isFleeing = !!entity.fleeingToGoalTag;
    console.debug(`[DestinationSystem] Nav request entity=${entityId} type=${pathType} radius=${radius} assigned=${hasAssigned} fleeing=${isFleeing}`,
      `from=(${start.x.toFixed(1)},${start.y.toFixed(1)}) to=(${destination.x.toFixed(1)},${destination.y.toFixed(1)})`);

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

  private cancelNavigationRequest(entityId: number): void {
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
    const goal = this.findGoalForTeam(lodge.lodge!.allowedTeam);

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

      const entityId = this.world.id(entity);
      if (entityId !== undefined) {
        this.cancelNavigationRequest(entityId);
      }

      break;
    }
  }

  private clearAllPaths(): void {
    for (const mover of this.movers) {
      if (mover.path) {
        mover.path.currentPath = [];
        mover.path.goalPath = [];
      }
      const entityId = this.world.id(mover);
      if (entityId !== undefined) {
        this.cancelNavigationRequest(entityId);
      }
    }
  }

  private clearAllWallAttackTargets(): void {
    for (const entity of this.world.with('wallAttackTarget')) {
      this.world.removeComponent(entity, 'wallAttackTarget');
    }
  }

  private handleMonsterPathBlocked(entity: Entity): void {
    const goal = this.findGoalForTeam('monster');
    if (!goal) return;

    const triedWalls = entity.wallAttackTarget?.triedWalls ?? new Set<number>();

    // If already targeting a wall that also failed, mark it as tried
    if (entity.wallAttackTarget) {
      const wallId = this.world.id(entity.wallAttackTarget.wallEntity);
      if (wallId !== undefined) triedWalls.add(wallId);
      this.world.removeComponent(entity, 'wallAttackTarget');
    }

    // Find active wall blueprints sorted by distance to the monster.
    // The nearest wall is the one the monster can actually path to — walls
    // further away may be blocked by closer walls.
    const monsterPos = entity.position!;
    const candidates: { entity: Entity; dist: number }[] = [];
    for (const wall of this.world.with('wallBlueprint', 'wallBlueprintTag', 'position')) {
      if (!wall.wallBlueprint.active) continue;
      if (wall.health?.isDead) continue;
      const wallId = this.world.id(wall);
      if (wallId !== undefined && triedWalls.has(wallId)) continue;
      const dx = wall.position.x - monsterPos.x;
      const dy = wall.position.y - monsterPos.y;
      candidates.push({ entity: wall, dist: dx * dx + dy * dy });
    }

    if (candidates.length === 0) return;

    candidates.sort((a, b) => a.dist - b.dist);
    this.world.addComponent(entity, 'wallAttackTarget', {
      wallEntity: candidates[0].entity,
      attackCooldown: 0,
      triedWalls
    });
  }

  private wallApproachPoint(mover: Entity, wall: Entity): { x: number; y: number } {
    const sites = wall.buildable?.sites;
    if (!sites || sites.length < 2) return { x: wall.position!.x, y: wall.position!.y };

    const s0 = sites[0], s1 = sites[1];
    const dx = s1.x - s0.x, dy = s1.y - s0.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((mover.position!.x - s0.x) * dx + (mover.position!.y - s0.y) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const projX = s0.x + t * dx;
    const projY = s0.y + t * dy;

    const toMonsterX = mover.position!.x - projX;
    const toMonsterY = mover.position!.y - projY;
    const dist = Math.hypot(toMonsterX, toMonsterY);

    if (dist < 1) return { x: wall.position!.x, y: wall.position!.y };

    // Offset from the wall segment toward the monster, far enough to be on
    // the walkable mesh (outside the grown obstacle buffer).
    const radius = mover.renderable?.radius ?? 0;
    const offset = GAME_CONFIG.WALL_BLUEPRINT_THICKNESS / 2 + radius * PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER + 4;
    return {
      x: projX + (toMonsterX / dist) * offset,
      y: projY + (toMonsterY / dist) * offset
    };
  }

  private computePathLength(path: { x: number; y: number }[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    }
    return total;
  }
}
