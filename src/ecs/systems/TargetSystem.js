import { System } from 'ecsy';
import TargetComponent from '../components/TargetComponent';
import PositionComponent from '../components/PositionComponent';

export default class TargetSystem extends System {

  execute() {
    this.queries.hasTarget.results.forEach(entity => {
      const target = entity.getComponent(TargetComponent).target;

      if (!target || !target.alive) {
        entity.removeComponent(TargetComponent);
        return;
      }
    });
  }
}

TargetSystem.queries = {
  hasTarget: { components: [TargetComponent, PositionComponent] }
}
