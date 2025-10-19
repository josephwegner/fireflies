import { System } from 'ecsy';
import { Interaction, Position, Targeting, Renderable } from '@/ecs/components';
import { ECSEntity } from '@/types';
import { Vector, SpatialGrid } from '@/utils';

export class InteractionSystem extends System {
  private spatialGrid!: SpatialGrid;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
    if (attributes?.spatialGrid) {
      this.spatialGrid = attributes.spatialGrid;
    }
  }

  execute(): void {
    const interactiveEntities = this.queries.interactive.results;

    // Clear previous potential targets and rebuild each frame
    interactiveEntities.forEach(entity => {
      const targeting = entity.getMutableComponent(Targeting);
      if (targeting) {
        targeting.potentialTargets = [];
      }
    });

    // Check each interactive entity against nearby entities from spatial grid
    interactiveEntities.forEach(entity => {
      const interaction = entity.getComponent(Interaction)!;
      const position = entity.getComponent(Position)!;
      const targeting = entity.getMutableComponent(Targeting);

      if (!targeting) return;

      // Use spatial grid to get nearby entities instead of checking all entities
      const nearbyEntities = this.spatialGrid.getNearby(
        position.x,
        position.y,
        interaction.interactionRadius
      );

      // Check each nearby entity
      nearbyEntities.forEach(otherEntity => {
        // Skip self
        if (entity === otherEntity) return;

        // Check if other entity is in the interactsWith list
        if (!this.canInteractWith(otherEntity, interaction.interactsWith)) return;

        // Check if in range (spatial grid returns candidates, still need exact distance)
        const otherPosition = otherEntity.getComponent(Position);
        if (!otherPosition) return;

        const dx = otherPosition.x - position.x;
        const dy = otherPosition.y - position.y;
        const distance = Vector.length(dx, dy);

        if (distance <= interaction.interactionRadius) {
          targeting.potentialTargets.push(otherEntity);
        }
      });
    });
  }

  canInteractWith(entity: ECSEntity, interactsWith: readonly string[]): boolean {
    const renderable = entity.getComponent(Renderable);
    if (!renderable) return false;
    
    return interactsWith.includes(renderable.type);
  }

  static queries = {
    interactive: {
      components: [Interaction, Position, Targeting]
    },
    positioned: {
      components: [Position]
    }
  };
}

