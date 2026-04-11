import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';

type WispEntity = With<Entity, 'wispTag' | 'lodge' | 'renderable'>;

export class WispVisualsSystem implements GameSystem {
  private wisps: Query<WispEntity>;

  constructor(world: GameWorld, _config: Record<string, any>) {
    this.wisps = world.with('wispTag', 'lodge', 'renderable') as any;
  }

  update(_delta: number, _time: number): void {
    for (const entity of this.wisps) {
      const { lodge, renderable } = entity;

      const tenantCount = lodge.tenants?.length || 0;
      const occupancyRatio = tenantCount / lodge.maxTenants;

      let newSprite = 'wisp';

      if (occupancyRatio >= 1.0) {
        newSprite = 'wisp-full';
      } else if (occupancyRatio >= 2 / 3) {
        newSprite = 'wisp-23-full';
      } else if (occupancyRatio >= 1 / 3) {
        newSprite = 'wisp-13-full';
      }

      if (renderable.sprite !== newSprite) {
        renderable.sprite = newSprite;
      }
    }
  }
}
