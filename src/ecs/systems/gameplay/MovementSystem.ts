import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { Vector } from '@/utils';

type MovingEntity = With<Entity, 'position' | 'velocity'>;

export class MovementSystem implements GameSystem {
  private moving: Query<MovingEntity>;

  constructor(private world: GameWorld, _config: Record<string, any>) {
    this.moving = world.with('position', 'velocity');
  }

  update(delta: number, _time: number): void {
    const dt = (delta || 16) / 1000;

    for (const entity of this.moving) {
      try {
        const { position, velocity } = entity;

        if (entity.health?.isDead) {
          velocity.vx = 0;
          velocity.vy = 0;
          continue;
        }

        const inCombat = !!entity.target;

        if (!inCombat && entity.path && entity.path.currentPath.length > 0) {
          const waypoint = entity.path.currentPath[0];
          const dx = waypoint.x - position.x;
          const dy = waypoint.y - position.y;
          const dist = Vector.length(dx, dy);

          if ((dist <= PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD && entity.path.currentPath.length > 1) || dist < PHYSICS_CONFIG.PATH_ARRIVAL_MIN) {
            entity.path.currentPath.shift();

            if (entity.path.currentPath.length === 0) {
              entity.path.currentPath = entity.path.goalPath;
              entity.path.goalPath = [];

              if (entity.path.currentPath.length === 0) {
                gameEvents.emit(GameEvents.PATH_COMPLETED, { entity, position: { x: position.x, y: position.y } });
              }
            }
          } else {
            const direction = Vector.normalize(dx, dy);
            velocity.vx = direction.x * PHYSICS_CONFIG.DEFAULT_SPEED;
            velocity.vy = direction.y * PHYSICS_CONFIG.DEFAULT_SPEED;
          }
        }

        position.x += velocity.vx * dt;
        position.y += velocity.vy * dt;

        this.applyFriction(velocity);
      } catch (error) {
        console.error('[MovementSystem] Error processing entity:', error);
      }
    }
  }

  private applyFriction(velocity: { vx: number; vy: number }): void {
    velocity.vx *= PHYSICS_CONFIG.FRICTION;
    velocity.vy *= PHYSICS_CONFIG.FRICTION;

    if (Math.abs(velocity.vx) < PHYSICS_CONFIG.MIN_VELOCITY) velocity.vx = 0;
    if (Math.abs(velocity.vy) < PHYSICS_CONFIG.MIN_VELOCITY) velocity.vy = 0;
  }
}
