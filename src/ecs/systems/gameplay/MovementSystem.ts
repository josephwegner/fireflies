import { System } from 'ecsy';
import { Position, Velocity, Path } from '@/ecs/components';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { Vector } from '@/utils';

export class MovementSystem extends System {
  execute(delta?: number): void {
    const dt = (delta || 16) / 1000;

    this.queries.moving.results.forEach(entity => {
      try {
        const position = entity.getMutableComponent(Position)!;
        const velocity = entity.getMutableComponent(Velocity)!;
        const pathComp = entity.getComponent(Path);

      if (pathComp && pathComp.currentPath && pathComp.currentPath.length > 0) {
        const target = pathComp.currentPath[0];
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const dist = Vector.length(dx, dy);

        if ((dist <= PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD && pathComp.currentPath.length > 1) || dist < PHYSICS_CONFIG.PATH_ARRIVAL_MIN) {
          pathComp.currentPath.shift();

          if (pathComp.currentPath.length === 0) {
            pathComp.currentPath = pathComp.nextPath;
            pathComp.nextPath = [];

            // Emit path completed event
            if (pathComp.currentPath.length === 0) {
              gameEvents.emit(GameEvents.PATH_COMPLETED, { entity, position: { x: position.x, y: position.y } });
            }
          }
        } else {
          const direction = Vector.normalize(dx, dy);
          const pathMovement = Vector.scale(direction, PHYSICS_CONFIG.DEFAULT_SPEED * dt);
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
      } catch (error) {
        console.error('[MovementSystem] Error processing entity:', entity.id, error);
      }
    });
  }

  applyFriction(velocity: Velocity): void {
    velocity.vx *= PHYSICS_CONFIG.FRICTION;
    velocity.vy *= PHYSICS_CONFIG.FRICTION;

    if (Math.abs(velocity.vx) < PHYSICS_CONFIG.MIN_VELOCITY) velocity.vx = 0;
    if (Math.abs(velocity.vy) < PHYSICS_CONFIG.MIN_VELOCITY) velocity.vy = 0;
  }

  static queries = {
    moving: {
      components: [Position, Velocity]
    }
  };
}
