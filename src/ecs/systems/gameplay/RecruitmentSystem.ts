import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, Team } from '@/ecs/Entity';
import type { GameSystem, SystemConfig } from '@/ecs/GameSystem';
import type { PathfindingService } from './PathfindingService';
import { PHYSICS_CONFIG } from '@/config';
import { clearPath } from '@/utils';

interface RecruitmentState {
  lodge: Entity;
  candidates: Map<string, Entity>;
  results: { entity: Entity; distance: number }[];
  pendingCount: number;
}

export class RecruitmentSystem implements GameSystem {
  private movers: Query<With<Entity, 'position' | 'velocity' | 'path'>>;
  private lodges: Query<With<Entity, 'lodge' | 'position' | 'destination'>>;
  private goals: Query<With<Entity, 'position' | 'destination' | 'goalTag'>>;
  private activeRecruitments = new Map<number, RecruitmentState>();
  private pathfinding: PathfindingService;

  constructor(private world: GameWorld, config: Pick<SystemConfig, 'pathfinding'>) {
    this.movers = world.with('position', 'velocity', 'path');
    this.lodges = world.with('lodge', 'position', 'destination');
    this.goals = world.with('position', 'destination', 'goalTag');
    this.pathfinding = config.pathfinding;
  }

  destroy(): void {
    this.activeRecruitments.clear();
  }

  update(_delta: number, _time: number): void {
    this.recruitForLodges();
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
        const entityId = this.world.id(candidate);
        const radius = candidate.renderable?.radius ?? 0;

        const requestId = this.pathfinding.requestPath(
          {
            start: { x: candidate.position!.x, y: candidate.position!.y },
            destination: { x: lodge.position.x, y: lodge.position.y },
            entityId,
            radius,
            pathType: 'score'
          },
          (path, _data) => {
            this.handleScoringResponse(lodgeId, requestId, path);
          },
          3000
        );
        recruitment.candidates.set(requestId, candidate);
      }
    }
  }

  private handleScoringResponse(
    lodgeId: number,
    requestId: string,
    path: { x: number; y: number }[] | null
  ): void {
    const recruitment = this.activeRecruitments.get(lodgeId);
    if (!recruitment) return;

    const candidate = recruitment.candidates.get(requestId);
    if (!candidate) return;

    recruitment.pendingCount--;

    if (path && path.length > 0) {
      const distance = this.computePathLength(path);
      recruitment.results.push({ entity: candidate, distance });
    }

    if (recruitment.pendingCount <= 0) {
      this.finalizeRecruitment(lodgeId, recruitment);
    }
  }

  private finalizeRecruitment(lodgeId: number, recruitment: RecruitmentState): void {
    this.activeRecruitments.delete(lodgeId);

    if (recruitment.results.length === 0) return;

    const lodge = recruitment.lodge;
    const goal = this.findGoalForTeam(lodge.lodge!.allowedTeam);

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

      clearPath(entity);

      break;
    }
  }

  private findGoalForTeam(team: Team): With<Entity, 'position' | 'destination' | 'goalTag'> | null {
    for (const goal of this.goals) {
      if (goal.destination.forTeam === team) return goal;
    }
    return null;
  }

  private computePathLength(path: { x: number; y: number }[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    }
    return total;
  }
}
