import { System } from 'ecsy';
import { Knockback, Position, Velocity, PhysicsBody, Wall } from '@/ecs/components';
import { PHYSICS_CONFIG } from '@/config';
import { Vector } from '@/utils';
import { ECSEntity } from '@/types';

export class KnockbackSystem extends System {
  execute(delta?: number): void {
    const dt = (delta || 16) / 1000;

    // Get all wall entities for collision detection
    const walls = this.queries.walls.results;

    this.queries.knockedBack.results.forEach(entity => {
      try {
        const knockback = entity.getMutableComponent(Knockback)!;
        const position = entity.getMutableComponent(Position)!;
        const velocity = entity.getMutableComponent(Velocity)!;
        const physicsBody = entity.getComponent(PhysicsBody);

        // Update elapsed time
        knockback.elapsed += delta || 16;

        // Check if knockback duration has expired
        if (knockback.elapsed >= knockback.duration) {
          entity.removeComponent(Knockback);
          return;
        }

        // Apply knockback force to velocity
        velocity.vx = knockback.force.x;
        velocity.vy = knockback.force.y;

        // Clamp velocity to max knockback velocity
        const speed = Vector.length(velocity.vx, velocity.vy);
        if (speed > PHYSICS_CONFIG.MAX_KNOCKBACK_VELOCITY) {
          const normalized = Vector.normalize(velocity.vx, velocity.vy);
          velocity.vx = normalized.x * PHYSICS_CONFIG.MAX_KNOCKBACK_VELOCITY;
          velocity.vy = normalized.y * PHYSICS_CONFIG.MAX_KNOCKBACK_VELOCITY;
        }

        // Update position based on velocity
        const newX = position.x + velocity.vx * dt;
        const newY = position.y + velocity.vy * dt;

        // Check for wall collisions if entity has physics body
        if (physicsBody && walls.length > 0) {
          const collision = this.checkWallCollision(
            newX,
            newY,
            physicsBody.collisionRadius,
            walls
          );

          if (collision) {
            // Stop at collision point
            position.x = collision.correctedX;
            position.y = collision.correctedY;

            // Reduce knockback force significantly on collision
            knockback.force.x *= 0.2;
            knockback.force.y *= 0.2;

            // Zero out velocity in collision direction
            if (collision.normal) {
              const dotProduct = velocity.vx * collision.normal.x + velocity.vy * collision.normal.y;
              velocity.vx -= dotProduct * collision.normal.x;
              velocity.vy -= dotProduct * collision.normal.y;
            }
          } else {
            // No collision, update position normally
            position.x = newX;
            position.y = newY;
          }
        } else {
          // No physics body or no walls, update position normally
          position.x = newX;
          position.y = newY;
        }

        // Apply friction to knockback force
        knockback.force.x *= PHYSICS_CONFIG.KNOCKBACK_FRICTION;
        knockback.force.y *= PHYSICS_CONFIG.KNOCKBACK_FRICTION;

        // Remove knockback if force becomes negligible
        if (Math.abs(knockback.force.x) < 0.1 && Math.abs(knockback.force.y) < 0.1) {
          entity.removeComponent(Knockback);
        }
      } catch (error) {
        console.error('[KnockbackSystem] Error processing entity:', entity.id, error);
      }
    });
  }

  checkWallCollision(
    x: number,
    y: number,
    radius: number,
    walls: ECSEntity[]
  ): { correctedX: number; correctedY: number; normal?: { x: number; y: number } } | null {
    for (const wallEntity of walls) {
      const wall = wallEntity.getComponent(Wall)!;
      
      // Check collision with each wall segment
      for (const segment of wall.segments) {
        for (let i = 0; i < segment.length - 1; i++) {
          const p1 = segment[i];
          const p2 = segment[i + 1];

          // Calculate distance from point to line segment
          const collision = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y, radius);
          
          if (collision.distance < radius + PHYSICS_CONFIG.WALL_COLLISION_THRESHOLD) {
            // Calculate correction to move entity away from wall
            const penetration = (radius + PHYSICS_CONFIG.WALL_COLLISION_THRESHOLD) - collision.distance;
            const correctedX = x + collision.normal.x * penetration;
            const correctedY = y + collision.normal.y * penetration;

            return {
              correctedX,
              correctedY,
              normal: collision.normal
            };
          }
        }
      }
    }

    return null;
  }

  pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number
  ): { distance: number; normal: { x: number; y: number } } {
    // Vector from segment start to point
    const dx = px - x1;
    const dy = py - y1;

    // Vector representing the segment
    const segX = x2 - x1;
    const segY = y2 - y1;
    const segLengthSq = segX * segX + segY * segY;

    if (segLengthSq === 0) {
      // Segment is a point
      const dist = Math.sqrt(dx * dx + dy * dy);
      return {
        distance: dist,
        normal: dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 1 }
      };
    }

    // Project point onto line segment (clamped to segment)
    const t = Math.max(0, Math.min(1, (dx * segX + dy * segY) / segLengthSq));

    // Find closest point on segment
    const closestX = x1 + t * segX;
    const closestY = y1 + t * segY;

    // Calculate distance and normal
    const distX = px - closestX;
    const distY = py - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    return {
      distance: dist,
      normal: dist > 0 ? { x: distX / dist, y: distY / dist } : { x: 0, y: 1 }
    };
  }

  static queries = {
    knockedBack: {
      components: [Knockback, Position, Velocity]
    },
    walls: {
      components: [Wall]
    }
  };
}

