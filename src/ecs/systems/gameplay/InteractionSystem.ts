import { System } from 'ecsy';
import { Interaction, Position, Targeting, FireflyTag, MonsterTag, WispTag } from '@/ecs/components';
import { ECSEntity } from '@/types';
import { Vector } from '@/utils';

export class InteractionSystem extends System {
  execute(): void {
    const interactiveEntities = this.queries.interactive.results;
    const allPositionedEntities = this.queries.positioned.results;

    // Clear previous potential targets and rebuild each frame
    interactiveEntities.forEach(entity => {
      const targeting = entity.getMutableComponent(Targeting);
      if (targeting) {
        targeting.potentialTargets = [];
      }
    });

    // Check each interactive entity against all positioned entities
    interactiveEntities.forEach(entity => {
      const interaction = entity.getComponent(Interaction)!;
      const position = entity.getComponent(Position)!;
      const targeting = entity.getMutableComponent(Targeting);

      if (!targeting) return;

      // Check against all positioned entities in the world
      allPositionedEntities.forEach(otherEntity => {
        // Skip self
        if (entity === otherEntity) return;

        // Check if other entity is in the interactsWith list
        if (!this.canInteractWith(otherEntity, interaction.interactsWith)) return;

        // Check if in range
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
    for (const type of interactsWith) {
      switch (type) {
        case 'firefly':
          if (entity.hasComponent(FireflyTag)) return true;
          break;
        case 'monster':
          if (entity.hasComponent(MonsterTag)) return true;
          break;
        case 'wisp':
          if (entity.hasComponent(WispTag)) return true;
          break;
      }
    }
    return false;
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

