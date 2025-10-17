import { System, Not } from 'ecsy';
import TargetingComponent from '../components/TargetingComponent';
import TargetComponent from '../components/TargetComponent';

export default class TargetingSystem extends System {

  execute() {
    this.queries.needsTargeting.results.forEach(entity => {
      const potentialTargets = entity.getComponent(TargetingComponent).potentialTargets;
      if (potentialTargets.length > 0) {
        this.acquireTarget(entity, potentialTargets);
      }
    });
  }

  acquireTarget(entity, potentialTargets) {
    const target = potentialTargets[0];
    entity.addComponent(TargetComponent, { target });
  }
} 

TargetingSystem.queries = {
  needsTargeting: { components: [TargetingComponent, Not(TargetComponent)] }
}