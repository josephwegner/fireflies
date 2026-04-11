import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';
import { Vector } from '@/utils';

interface DyingEntity {
  entity: Entity;
  timeElapsed: number;
}

export class DamageSystem implements GameSystem {
  private dyingEntities: DyingEntity[] = [];
  private handleDamageBound: (data: any) => void;

  constructor(private world: GameWorld, _config: Record<string, any>) {
    this.handleDamageBound = this.handleDamage.bind(this);
    gameEvents.on(GameEvents.ATTACK_HIT, this.handleDamageBound);
  }

  update(delta: number, _time: number): void {
    const dt = delta || 16;
    this.processDyingEntities(dt);
  }

  destroy(): void {
    gameEvents.off(GameEvents.ATTACK_HIT, this.handleDamageBound);
    this.dyingEntities = [];
  }

  private handleDamage(data: { attacker: Entity; target: Entity; damage: number; knockbackForce?: number }): void {
    const { attacker, target, damage, knockbackForce } = data;

    if (!target.health) return;
    if (!target.position) return;

    if (target.health.isDead) return;

    if (damage > 0) {
      target.health.currentHealth = Math.max(0, target.health.currentHealth - damage);
    }

    if (target.health.currentHealth <= 0) {
      this.handleDeath(target);
      return;
    }

    if (knockbackForce && knockbackForce > 0) {
      this.applyKnockback(attacker, target, knockbackForce);
    }

    gameEvents.emit(GameEvents.ENTITY_DAMAGED, { entity: target, damage });
  }

  private handleDeath(entity: Entity): void {
    entity.health!.isDead = true;
    entity.health!.currentHealth = 0;

    if (entity.position) {
      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity,
        position: { x: entity.position.x, y: entity.position.y }
      });
    }

    if (entity.renderable) {
      this.dyingEntities.push({ entity, timeElapsed: 0 });
    } else {
      this.world.remove(entity);
    }
  }

  private applyKnockback(attacker: Entity, target: Entity, knockbackForce: number): void {
    const attackerPos = attacker.position;
    const targetPos = target.position;
    const targetVelocity = target.velocity;

    if (!attackerPos || !targetPos || !targetVelocity) return;

    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    if (distance === 0) return;

    const direction = Vector.normalize(dx, dy);
    const impulse = Vector.scale(direction, knockbackForce);

    targetVelocity.vx += impulse.x;
    targetVelocity.vy += impulse.y;

    gameEvents.emit(GameEvents.KNOCKBACK_APPLIED, { entity: target, force: impulse });
  }

  private processDyingEntities(dt: number): void {
    const toRemove: number[] = [];

    this.dyingEntities.forEach((dying, index) => {
      dying.timeElapsed += dt;

      if (dying.entity.renderable) {
        const progress = dying.timeElapsed / PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;
        dying.entity.renderable.alpha = Math.max(0, 1 - progress);
      }

      if (dying.timeElapsed >= PHYSICS_CONFIG.DEATH_ANIMATION_DURATION) {
        if (this.world.has(dying.entity)) {
          this.world.remove(dying.entity);
        }
        toRemove.push(index);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.dyingEntities.splice(toRemove[i], 1);
    }
  }
}
