import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';

const SPEED = 20; // Speed in pixels per second
const FRICTION = 0.01;
const MIN_VELOCITY = 0.001;

// Vector utility functions
const Vector = {
  length(x, y) {
    return Math.sqrt(x * x + y * y);
  },
  
  normalize(x, y) {
    const len = this.length(x, y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },
  
  scale(vector, scalar) {
    return { x: vector.x * scalar, y: vector.y * scalar };
  },
  
  add(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  }
};

export default class MovementSystem extends System {
  execute(delta) {
    const dt = delta / 1000; // Convert to seconds

    this.queries.moving.results.forEach(entity => {
      const position = entity.getMutableComponent(PositionComponent);
      const velocity = entity.getMutableComponent(VelocityComponent);
      const pathComp = entity.getComponent(PathComponent);

      if (pathComp.currentPath !== null && pathComp.currentPath.length > 0) {
        const target = pathComp.currentPath[0];
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const dist = Vector.length(dx, dy);

        if ((dist <= .5 && pathComp.currentPath.length > 1) || dist < .01) {
          pathComp.currentPath.shift(); // Remove reached waypoint

          if (pathComp.currentPath.length === 0) {
            pathComp.currentPath = pathComp.nextPath;
            pathComp.nextPath = []; // Clear nextPath after switching
          }
        } else {
          // Move toward target
          const direction = Vector.normalize(dx, dy);
          const pathMovement = Vector.scale(direction, SPEED * dt);
          const velocityMovement = { x: velocity.vx * dt, y: velocity.vy * dt };
          
          // Combine path movement and velocity
          const totalMovement = Vector.add(pathMovement, velocityMovement);
          
          position.x += totalMovement.x;
          position.y += totalMovement.y;
        }
      } else {
        // Move based on velocity if no path is assigned
        position.x += velocity.vx * dt;
        position.y += velocity.vy * dt;
      }

      this.applyFriction(velocity);
    });
  }

  applyFriction(velocity) {
    velocity.vx *= FRICTION;
    velocity.vy *= FRICTION;
    
    // Zero out very small velocities to prevent drift
    if (Math.abs(velocity.vx) < MIN_VELOCITY) velocity.vx = 0;
    if (Math.abs(velocity.vy) < MIN_VELOCITY) velocity.vy = 0;
  }
}

MovementSystem.queries = {
  moving: {
    components: [PositionComponent, VelocityComponent, PathComponent]
  }
};
