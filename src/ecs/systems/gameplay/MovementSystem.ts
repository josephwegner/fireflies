import { System } from 'ecsy';
import { Position, Velocity, Path, Target, Health } from '@/ecs/components';
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

        // Skip movement for dead entities
        const health = entity.getComponent(Health);
        if (health && health.isDead) {
          // Zero out velocity so dead entities don't drift
          velocity.vx = 0;
          velocity.vy = 0;
          return;
        }

        // Check if entity is in combat (has Target component)
        const inCombat = entity.hasComponent(Target);

        // Determine desired velocity based on state
        if (!inCombat && pathComp && pathComp.currentPath && pathComp.currentPath.length > 0) {
          // Following a path - steer toward next waypoint
          const target = pathComp.currentPath[0];
          const dx = target.x - position.x;
          const dy = target.y - position.y;
          const dist = Vector.length(dx, dy);

          // Check if we've arrived at current waypoint
          if ((dist <= PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD && pathComp.currentPath.length > 1) || dist < PHYSICS_CONFIG.PATH_ARRIVAL_MIN) {
            pathComp.currentPath.shift();

            if (pathComp.currentPath.length === 0) {
              pathComp.currentPath = pathComp.nextPath;
              pathComp.nextPath = [];

              if (pathComp.currentPath.length === 0) {
                console.log(`[MovementSystem] PATH_COMPLETED for entity ${entity.id} at position (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
                gameEvents.emit(GameEvents.PATH_COMPLETED, { entity, position: { x: position.x, y: position.y } });
              }
            }
          } else {
            // Set velocity toward waypoint (steering)
            const direction = Vector.normalize(dx, dy);
            velocity.vx = direction.x * PHYSICS_CONFIG.DEFAULT_SPEED;
            velocity.vy = direction.y * PHYSICS_CONFIG.DEFAULT_SPEED;
          }
        }

        position.x += velocity.vx * dt;
        position.y += velocity.vy * dt;

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
