import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { GameSystemBase, type SystemConfig } from '@/ecs/GameSystem';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { lineSegmentToRect, pointToSegmentDistance, clearPath } from '@/utils';

export class WallActivationSystem extends GameSystemBase {
  private world: GameWorld;
  private worker: Worker;
  private walls: Query<With<Entity, 'wall' | 'wallTag'>>;
  private wallBlueprints: Query<With<Entity, 'wallBlueprint' | 'wallBlueprintTag' | 'buildable'>>;

  constructor(world: GameWorld, config: Pick<SystemConfig, 'worker'>) {
    super();
    this.world = world;
    this.worker = config.worker;
    this.walls = world.with('wall', 'wallTag') as any;
    this.wallBlueprints = world.with('wallBlueprint', 'wallBlueprintTag', 'buildable') as any;

    this.listen(GameEvents.BUILD_COMPLETE, this.handleBuildComplete);
    this.listen(GameEvents.WALL_DESTROYED, this.handleWallDestroyed);
  }

  update(_delta: number, _time: number): void {
    // Event-driven — no per-frame work needed
  }

  private handleWallDestroyed(): void {
    this.rebuildNavMesh();
  }

  private handleBuildComplete(data: { entity: Entity }): void {
    const { entity } = data;
    if (!entity.wallBlueprint || !entity.wallBlueprintTag) return;

    entity.wallBlueprint.active = true;

    this.pushOutEntities(entity);
    this.rebuildNavMesh();

    gameEvents.emit(GameEvents.WALL_ACTIVATED, { entity });
  }

  private pushOutEntities(wallEntity: Entity): void {
    const sites = wallEntity.buildable!.sites;
    const segA = { x: sites[0].x, y: sites[0].y };
    const segB = { x: sites[1].x, y: sites[1].y };
    const halfThick = GAME_CONFIG.WALL_BLUEPRINT_THICKNESS / 2;
    const margin = 1;

    const positioned = this.world.with('position');
    for (const entity of positioned) {
      if (entity === wallEntity) continue;
      const pos = entity.position;

      const dist = pointToSegmentDistance(pos, segA, segB);
      if (dist >= halfThick) continue;

      // Push perpendicular to the wall segment
      const dx = segB.x - segA.x;
      const dy = segB.y - segA.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;

      // Normal to the segment (perpendicular)
      const nx = -dy / len;
      const ny = dx / len;

      // Determine which side the entity is on
      const toEntity = { x: pos.x - segA.x, y: pos.y - segA.y };
      const side = toEntity.x * nx + toEntity.y * ny;
      const pushDir = side >= 0 ? 1 : -1;

      const pushDist = halfThick - dist + margin;
      pos.x += nx * pushDir * pushDist;
      pos.y += ny * pushDir * pushDist;

      clearPath(entity);
    }
  }

  private rebuildNavMesh(): void {
    const allWalls: { x: number; y: number }[][] = [];

    // Collect existing wall contours
    for (const wallEntity of this.walls) {
      for (const segment of wallEntity.wall.segments) {
        allWalls.push(segment);
      }
    }

    // Add rectangles for all active wall blueprints
    for (const blueprint of this.wallBlueprints) {
      if (!blueprint.wallBlueprint.active) continue;
      const sites = blueprint.buildable.sites;
      const rect = lineSegmentToRect(
        { x: sites[0].x, y: sites[0].y },
        { x: sites[1].x, y: sites[1].y },
        GAME_CONFIG.WALL_BLUEPRINT_THICKNESS
      );
      allWalls.push(rect);
    }

    this.worker.postMessage({ action: 'updateWalls', walls: allWalls });
  }
}
