import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { GameSystemBase } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';
import { Vector } from '@/utils';

interface DyingEntity {
  entity: Entity;
  timeElapsed: number;
}

export class DamageSystem extends GameSystemBase {
  private dyingEntities: DyingEntity[] = [];

  constructor(private world: GameWorld, _config: Record<string, never>) {
    super();
    this.listen(GameEvents.ATTACK_HIT, this.handleDamage);
  }

  update(delta: number, _time: number): void {
    const dt = delta || 16;
    this.processDyingEntities(dt);
  }

  destroy(): void {
    super.destroy();
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

    if (entity.lodge) {
      const lodgePos = entity.position;
      for (const tenant of [...entity.lodge.tenants]) {
        if (!this.world.has(tenant)) continue;
        if (tenant.health) {
          tenant.health.isDead = true;
          tenant.health.currentHealth = 0;
        }
        if (lodgePos) {
          gameEvents.emit(GameEvents.ENTITY_DIED, {
            entity: tenant,
            position: { x: lodgePos.x, y: lodgePos.y }
          });
        }
        this.world.remove(tenant);
      }
      entity.lodge.tenants = [];
      entity.lodge.incoming = [];
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
      const isStructure = dying.entity.physicsBody?.isStatic;
      const duration = isStructure ? PHYSICS_CONFIG.STRUCTURE_DEATH_ANIMATION_DURATION : PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;

      if (dying.entity.renderable) {
        if (isStructure) {
          this.updateStructureDeathAnimation(dying, duration);
        } else {
          const progress = dying.timeElapsed / duration;
          dying.entity.renderable.alpha = Math.max(0, 1 - progress);
        }
      }

      if (dying.timeElapsed >= duration) {
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

  private updateStructureDeathAnimation(dying: DyingEntity, duration: number): void {
    const progress = dying.timeElapsed / duration;
    const renderable = dying.entity.renderable!;

    if (progress < PHYSICS_CONFIG.STRUCTURE_DEATH_FLICKER_END) {
      const flicker = Math.sin(dying.timeElapsed * 0.15) * 0.5 + 0.5;
      renderable.alpha = 0.3 + flicker * 0.7;
    } else if (progress < PHYSICS_CONFIG.STRUCTURE_DEATH_SHRINK_END) {
      const shrinkProgress = (progress - PHYSICS_CONFIG.STRUCTURE_DEATH_FLICKER_END) / 0.3;
      renderable.scale = Math.max(0.1, 1 - shrinkProgress * 0.9);
      renderable.alpha = 1 - shrinkProgress * 0.3;
    } else {
      const fadeProgress = (progress - PHYSICS_CONFIG.STRUCTURE_DEATH_SHRINK_END) / 0.3;
      renderable.alpha = Math.max(0, 0.7 * (1 - fadeProgress));
      renderable.scale = Math.max(0.05, 0.1 * (1 - fadeProgress));
    }
  }
}
