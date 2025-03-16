import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';

const SPEED = 50; // Speed in pixels per second

export default class MovementSystem extends System {
  execute(delta, time) {
    const dt = delta / 1000; // Convert ms to seconds

    this.queries.moving.results.forEach(entity => {
      const position = entity.getMutableComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const pathComp = entity.getComponent(PathComponent);

      if (pathComp.path.length > 0) {
        const target = pathComp.path[0];
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1) {
          // Move toward target
          position.x += (dx / dist) * SPEED * dt;
          position.y += (dy / dist) * SPEED * dt;
        } else {
          pathComp.path.shift(); // Remove reached waypoint
        }
      } else {
        // Move based on velocity if no path is assigned
        position.x += velocity.vx * dt;
        position.y += velocity.vy * dt;
      }
    });
  }
}

MovementSystem.queries = {
  moving: {
    components: [PositionComponent, VelocityComponent, PathComponent]
  }
};
