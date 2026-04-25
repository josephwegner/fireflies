import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';

type NeedsTargeting = With<Entity, 'targeting'>;

export class TargetingSystem implements GameSystem {
  private needsTargeting: Query<NeedsTargeting>;

  constructor(private world: GameWorld, _config: Record<string, never>) {
    this.needsTargeting = world.with('targeting').without('target');
  }

  update(_delta: number, _time: number): void {
    for (const entity of this.needsTargeting) {
      if (entity.targeting.potentialTargets.length > 0) {
        const target = entity.targeting.potentialTargets[0];
        this.world.addComponent(entity, 'target', { target });
        gameEvents.emit(GameEvents.TARGET_ACQUIRED, { entity, target });
      }
    }
  }
}
