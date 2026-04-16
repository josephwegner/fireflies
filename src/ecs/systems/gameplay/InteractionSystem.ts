import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, Team } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { Vector, SpatialGrid } from '@/utils';

type InteractiveEntity = With<Entity, 'interaction' | 'position' | 'targeting'>;

export class InteractionSystem implements GameSystem {
  private interactive: Query<InteractiveEntity>;
  private spatialGrid: SpatialGrid;

  constructor(private world: GameWorld, config: Record<string, any>) {
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

        const dx = otherPos.x - position.x;
        const dy = otherPos.y - position.y;
        const distance = Vector.length(dx, dy);

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
