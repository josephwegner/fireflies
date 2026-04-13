import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { PHYSICS_CONFIG } from '@/config';
import { getEntityType } from '@/utils';

export class RedirectSystem implements GameSystem {
  private movers: Query<With<Entity, 'position' | 'velocity' | 'path'>>;
  private redirects: Query<With<Entity, 'position' | 'redirect' | 'redirectTag'>>;

  private entityRedirectTracking = new Map<number, Set<number>>();

  constructor(private world: GameWorld, _config: Record<string, any>) {
    this.movers = world.with('position', 'velocity', 'path');
    this.redirects = world.with('position', 'redirect', 'redirectTag');
  }

  destroy(): void {
    this.entityRedirectTracking.clear();
  }

  update(_delta: number, _time: number): void {
    for (const mover of this.movers) {
      const entityId = this.world.id(mover);
      if (entityId === undefined) continue;
      if (mover.redirectTarget) continue;
      if (mover.assignedDestination) continue;

      const entityType = getEntityType(mover);
      if (!entityType) continue;

      let tracking = this.entityRedirectTracking.get(entityId);
      if (!tracking) {
        tracking = new Set();
        this.entityRedirectTracking.set(entityId, tracking);
      }

      for (const redirect of this.redirects) {
        const redirectId = this.world.id(redirect);
        if (redirectId === undefined) continue;

        if (!redirect.redirect.for.includes(entityType)) continue;

        const dx = mover.position.x - redirect.position.x;
        const dy = mover.position.y - redirect.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inRadius = dist <= redirect.redirect.radius;

        if (!inRadius) {
          tracking.delete(redirectId);
          continue;
        }

        if (tracking.has(redirectId)) continue;

        tracking.add(redirectId);

        const exit = this.pickWeightedExit(redirect.redirect.exits);
        const jitter = PHYSICS_CONFIG.POSITION_JITTER;
        this.world.addComponent(mover, 'redirectTarget', {
          x: exit.x + (Math.random() * 2 - 1) * jitter,
          y: exit.y + (Math.random() * 2 - 1) * jitter
        });

        mover.path.currentPath = [];
        mover.path.goalPath = [];

        break;
      }
    }

    this.cleanupStaleEntities();
  }

  private pickWeightedExit(exits: { x: number; y: number; weight: number }[]): { x: number; y: number } {
    let total = 0;
    for (const exit of exits) total += exit.weight;
    let roll = Math.random() * total;
    for (const exit of exits) {
      roll -= exit.weight;
      if (roll <= 0) return exit;
    }
    return exits[exits.length - 1];
  }

  private cleanupStaleEntities(): void {
    for (const entityId of this.entityRedirectTracking.keys()) {
      const entity = this.world.entity(entityId);
      if (!entity) {
        this.entityRedirectTracking.delete(entityId);
      }
    }
  }
}
