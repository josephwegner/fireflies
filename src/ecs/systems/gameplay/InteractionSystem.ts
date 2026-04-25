import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, Team } from '@/ecs/Entity';
import type { GameSystem, SystemConfig } from '@/ecs/GameSystem';
import { Vector, SpatialGrid } from '@/utils';
import { pointToSegmentDistance } from '@/utils';

type InteractiveEntity = With<Entity, 'interaction' | 'position' | 'targeting'>;

export class InteractionSystem implements GameSystem {
  private interactive: Query<InteractiveEntity>;
  private spatialGrid: SpatialGrid;

  constructor(private world: GameWorld, config: Pick<SystemConfig, 'spatialGrid'>) {
    this.interactive = world.with('interaction', 'position', 'targeting');
    this.spatialGrid = config.spatialGrid;
  }

  update(_delta: number, _time: number): void {
    for (const entity of this.interactive) {
      entity.targeting.potentialTargets = [];
    }

    for (const entity of this.interactive) {
      const { interaction, position, targeting } = entity;

      const nearbyEntities = this.spatialGrid.getNearby(
        position.x,
        position.y,
        interaction.interactionRadius
      );

      for (const other of nearbyEntities) {
        if (entity === other) continue;
        if (other.health?.isDead) continue;
        if (!this.isEnemy(entity.team, other.team)) continue;

        const otherPos = other.position;
        if (!otherPos) continue;

        let distance: number;
        if (other.wallBlueprintTag && other.buildable?.sites?.length >= 2) {
          const sites = other.buildable.sites;
          distance = pointToSegmentDistance(position, sites[0], sites[1]);
        } else {
          const dx = otherPos.x - position.x;
          const dy = otherPos.y - position.y;
          distance = Vector.length(dx, dy);
        }

        if (distance <= interaction.interactionRadius) {
          targeting.potentialTargets.push(other);
        }
      }
    }
  }

  private isEnemy(sourceTeam: Team | undefined, otherTeam: Team | undefined): boolean {
    if (!sourceTeam || !otherTeam) return false;
    return sourceTeam !== otherTeam;
  }
}
