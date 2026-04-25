import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, Team } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import type { PathfindingService } from './PathfindingService';
import { PHYSICS_CONFIG, GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';

export class DestinationSystem implements GameSystem {
  private movers: Query<With<Entity, 'position' | 'velocity' | 'path'>>;
  private goals: Query<With<Entity, 'position' | 'destination' | 'goalTag'>>;
  private pathfinding: PathfindingService;

  private navigationRequestForEntity = new Map<number, string>();

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.movers = world.with('position', 'velocity', 'path');
    this.goals = world.with('position', 'destination', 'goalTag');
    this.pathfinding = config.pathfinding;

    this.onNavmeshUpdated = this.onNavmeshUpdated.bind(this);
    gameEvents.on(GameEvents.NAVMESH_UPDATED, this.onNavmeshUpdated);
  }

  destroy(): void {
    this.navigationRequestForEntity.clear();
    gameEvents.off(GameEvents.NAVMESH_UPDATED, this.onNavmeshUpdated);
  }

  update(_delta: number, _time: number): void {
    this.navigateMovers();
  }

  private onNavmeshUpdated(): void {
    for (const entityId of this.navigationRequestForEntity.keys()) {
      const requestId = this.navigationRequestForEntity.get(entityId)!;
      this.pathfinding.cancelRequest(requestId);
    }
    this.navigationRequestForEntity.clear();
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

  private fireNavRequest(
    entity: Entity,
    start: { x: number; y: number },
    destination: { x: number; y: number },
    pathType: string
  ): void {
    const entityId = this.world.id(entity);
    if (entityId === undefined) return;
    const radius = entity.renderable?.radius ?? 0;

    const hasAssigned = !!entity.assignedDestination;
    const isFleeing = !!entity.fleeingToGoalTag;
    console.debug(`[DestinationSystem] Nav request entity=${entityId} type=${pathType} radius=${radius} assigned=${hasAssigned} fleeing=${isFleeing}`,
      `from=(${start.x.toFixed(1)},${start.y.toFixed(1)}) to=(${destination.x.toFixed(1)},${destination.y.toFixed(1)})`);

    const requestId = this.pathfinding.requestPath(
      { start, destination, entityId, radius, pathType },
      (path, data) => {
        this.handleNavResponse(entityId, requestId, path, data);
      }
    );

    this.navigationRequestForEntity.set(entityId, requestId);
  }

  private handleNavResponse(
    entityId: number,
    requestId: string,
    path: { x: number; y: number }[] | null,
    data: any
  ): void {
    const currentNavRequest = this.navigationRequestForEntity.get(entityId);
    if (currentNavRequest !== requestId) return;

    this.navigationRequestForEntity.delete(entityId);

    if (data.error === 'no path found') {
      const entity = this.world.entity(entityId);
      if (entity?.monsterTag) {
        this.handleMonsterPathBlocked(entity);
      }
    }

    const entity = this.world.entity(entityId);
    if (!entity || !entity.path) return;

    if (path) {
      const { pathType } = data;
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

  private cancelNavigationRequest(entityId: number): void {
    const navReqId = this.navigationRequestForEntity.get(entityId);
    if (navReqId) {
      this.pathfinding.cancelRequest(navReqId);
      this.navigationRequestForEntity.delete(entityId);
    }
  }

  private handleMonsterPathBlocked(entity: Entity): void {
    const goal = this.findGoalForTeam('monster');
    if (!goal) return;

    const triedWalls = entity.wallAttackTarget?.triedWalls ?? new Set<number>();

    if (entity.wallAttackTarget) {
      const wallId = this.world.id(entity.wallAttackTarget.wallEntity);
      if (wallId !== undefined) triedWalls.add(wallId);
      this.world.removeComponent(entity, 'wallAttackTarget');
    }

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

    const radius = mover.renderable?.radius ?? 0;
    const offset = GAME_CONFIG.WALL_BLUEPRINT_THICKNESS / 2 + radius * PHYSICS_CONFIG.WALL_BUFFER_MULTIPLIER + 4;
    return {
      x: projX + (toMonsterX / dist) * offset,
      y: projY + (toMonsterY / dist) * offset
    };
  }
}
