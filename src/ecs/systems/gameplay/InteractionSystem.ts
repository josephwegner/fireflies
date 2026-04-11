import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
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
    // Clear previous potential targets
    for (const entity of this.interactive) {
      entity.targeting.potentialTargets = [];
    }

    // Rebuild interactions from spatial grid
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
        if (!this.canInteractWith(other, interaction.interactsWith)) continue;

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

  private canInteractWith(entity: Entity, interactsWith: readonly string[]): boolean {
    if (!entity.renderable) return false;
    return interactsWith.includes(entity.renderable.type);
  }
}
