import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';

const SPEED = 1; // Speed in pixels per second

export default class MovementSystem extends System {
  execute(delta, time) {
    const dt = delta / 1000; // Convert ms to seconds

    this.queries.moving.results.forEach(entity => {
      const position = entity.getMutableComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const pathComp = entity.getComponent(PathComponent);

      if (pathComp.currentPath !== null && pathComp.currentPath.length > 0) {
        const target = pathComp.currentPath[0];
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const dist = Math.hypot(dx, dy);

        if ((dist <= .75 && pathComp.currentPath.length > 1) || dist < .01) {
          pathComp.currentPath.shift(); // Remove reached waypoint

          if (pathComp.currentPath.length === 0) {
            pathComp.currentPath = pathComp.nextPath;
            pathComp.nextPath = []; // Clear nextPath after switching
          }
        } else {
          // Move toward target
          position.x += (dx / dist) * SPEED * dt;
          position.y += (dy / dist) * SPEED * dt;
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
