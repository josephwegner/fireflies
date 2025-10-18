import { System, Not } from 'ecsy';
import { Targeting, Target } from '@/ecs/components';
import { ECSEntity } from '@/types';

export class TargetingSystem extends System {
  execute(): void {
    this.queries.needsTargeting.results.forEach(entity => {
      const targeting = entity.getComponent(Targeting)!;
      if (targeting.potentialTargets.length > 0) {
        this.acquireTarget(entity, targeting.potentialTargets);
      }
    });
  }

  acquireTarget(entity: ECSEntity, potentialTargets: ECSEntity[]): void {
    const target = potentialTargets[0];
    entity.addComponent(Target, { target });
  }

  static queries = {
    needsTargeting: {
      components: [Targeting, Not(Target)]
    }
  };
}
