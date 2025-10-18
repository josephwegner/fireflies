import { System } from 'ecsy';
import { Position, Velocity, Path } from '@/ecs/components';

const SPEED = 20;
const FRICTION = 0.01;
const MIN_VELOCITY = 0.001;

const Vector = {
  length(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
  },

  normalize(x: number, y: number): { x: number; y: number } {
    const len = this.length(x, y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },

  scale(vector: { x: number; y: number }, scalar: number): { x: number; y: number } {
    return { x: vector.x * scalar, y: vector.y * scalar };
  },

  add(v1: { x: number; y: number }, v2: { x: number; y: number }): { x: number; y: number } {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  }
};

export class MovementSystem extends System {
  execute(delta?: number): void {
    const dt = (delta || 16) / 1000;

    this.queries.moving.results.forEach(entity => {
      const position = entity.getMutableComponent(Position)!;
      const velocity = entity.getMutableComponent(Velocity)!;
      const pathComp = entity.getComponent(Path);

      if (pathComp && pathComp.currentPath && pathComp.currentPath.length > 0) {
        const target = pathComp.currentPath[0];
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const dist = Vector.length(dx, dy);

        if ((dist <= 0.5 && pathComp.currentPath.length > 1) || dist < 0.01) {
          pathComp.currentPath.shift();

          if (pathComp.currentPath.length === 0) {
            pathComp.currentPath = pathComp.nextPath;
            pathComp.nextPath = [];
          }
        } else {
          const direction = Vector.normalize(dx, dy);
          const pathMovement = Vector.scale(direction, SPEED * dt);
          const velocityMovement = { x: velocity.vx * dt, y: velocity.vy * dt };

          const totalMovement = Vector.add(pathMovement, velocityMovement);

          position.x += totalMovement.x;
          position.y += totalMovement.y;
        }
      } else {
        position.x += velocity.vx * dt;
        position.y += velocity.vy * dt;
      }

      this.applyFriction(velocity);
    });
  }

  applyFriction(velocity: Velocity): void {
    velocity.vx *= FRICTION;
    velocity.vy *= FRICTION;

    if (Math.abs(velocity.vx) < MIN_VELOCITY) velocity.vx = 0;
    if (Math.abs(velocity.vy) < MIN_VELOCITY) velocity.vy = 0;
  }

  static queries = {
    moving: {
      components: [Position, Velocity]
    }
  };
}
