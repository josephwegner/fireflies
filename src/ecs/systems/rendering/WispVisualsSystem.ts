import { System } from 'ecsy';
import { Lodge, Renderable, WispTag } from '@/ecs/components';
import { ECSEntity } from '@/types';

export class WispVisualsSystem extends System {
  static queries = {
    wisps: {
      components: [WispTag, Lodge, Renderable]
    }
  };

  execute(delta: number, time: number): void {
    const { wisps } = this.queries;

    wisps.results.forEach((entity: ECSEntity) => {
      const lodge = entity.getComponent(Lodge)!;
      const renderable = entity.getMutableComponent(Renderable)!;

      // Calculate occupancy percentage
      const tenantCount = lodge.tenants?.length || 0;
      const maxTenants = lodge.maxTenants;
      const occupancyRatio = tenantCount / maxTenants;

      // Update sprite based on occupancy
      let newSprite = 'wisp'; // Default empty wisp
      
      if (occupancyRatio >= 1.0) {
        // Completely full
        newSprite = 'wisp-full';
      } else if (occupancyRatio >= 2/3) {
        // 2/3 full
        newSprite = 'wisp-23-full';
      } else if (occupancyRatio >= 1/3) {
        // 1/3 full
        newSprite = 'wisp-13-full';
      }

      // Only update if sprite has changed
      if (renderable.sprite !== newSprite) {
        renderable.sprite = newSprite;
      }
    });
  }
}

