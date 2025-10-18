import { System } from 'ecsy';
import { Health, Position, Renderable, Knockback } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';
import { ECSEntity } from '@/types';
import { Vector } from '@/utils';

interface DyingEntity {
  entity: ECSEntity;
  timeElapsed: number;
}

export class DamageSystem extends System {
  private dyingEntities: DyingEntity[] = [];

  init(): void {
    // Subscribe to damage events
    gameEvents.on(GameEvents.ATTACK_HIT, this.handleDamage.bind(this));
  }

  execute(delta?: number): void {
    const dt = delta || 16;

    // Process death animations
    this.processDyingEntities(dt);
  }

  handleDamage(data: { attacker: ECSEntity; target: ECSEntity; damage: number; knockbackForce?: number }): void {
    const { attacker, target, damage, knockbackForce } = data;

    // Check if target has health component
    if (!target.hasComponent(Health)) {
      return;
    }

    const health = target.getMutableComponent(Health)!;

    // Don't damage already dead entities
    if (health.isDead) {
      return;
    }

    // Apply damage (ensure it's non-negative and doesn't heal)
    if (damage > 0) {
      health.currentHealth = Math.max(0, health.currentHealth - damage);
    }

    // Check for death
    if (health.currentHealth <= 0) {
      this.handleDeath(target);
    }

    // Apply knockback if specified
    if (knockbackForce && knockbackForce > 0) {
      this.applyKnockback(attacker, target, knockbackForce);
    }
  }

  handleDeath(entity: ECSEntity): void {
    const health = entity.getMutableComponent(Health)!;
    health.isDead = true;
    health.currentHealth = 0;

    const position = entity.getComponent(Position);
    if (position) {
      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity,
        position: { x: position.x, y: position.y }
      });
    }

    // Start death animation if entity has renderable
    if (entity.hasComponent(Renderable)) {
      this.dyingEntities.push({ entity, timeElapsed: 0 });
    } else {
      // Remove immediately if no animation
      entity.remove();
    }
  }

  applyKnockback(attacker: ECSEntity, target: ECSEntity, knockbackForce: number): void {
    const attackerPos = attacker.getComponent(Position);
    const targetPos = target.getComponent(Position);

    if (!attackerPos || !targetPos) {
      return;
    }

    // Calculate knockback direction (from attacker to target)
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    if (distance === 0) {
      return;
    }

    // Normalize and apply force
    const direction = Vector.normalize(dx, dy);
    const force = Vector.scale(direction, knockbackForce);

    // Add knockback component
    if (target.hasComponent(Knockback)) {
      const knockback = target.getMutableComponent(Knockback)!;
      knockback.force = force;
      knockback.duration = 200; // Fixed duration for knockback
      knockback.elapsed = 0;
    } else {
      target.addComponent(Knockback, {
        force,
        duration: 200,
        elapsed: 0
      });
    }

    gameEvents.emit(GameEvents.KNOCKBACK_APPLIED, { entity: target, force });
  }

  processDyingEntities(dt: number): void {
    const toRemove: number[] = [];

    this.dyingEntities.forEach((dying, index) => {
      dying.timeElapsed += dt;

      // Update alpha for fade-out effect
      if (dying.entity.hasComponent(Renderable)) {
        const renderable = dying.entity.getMutableComponent(Renderable)!;
        const progress = dying.timeElapsed / PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;
        renderable.alpha = Math.max(0, 1 - progress);
      }

      // Remove entity after animation completes
      if (dying.timeElapsed >= PHYSICS_CONFIG.DEATH_ANIMATION_DURATION) {
        if (dying.entity.alive) {
          dying.entity.remove();
        }
        toRemove.push(index);
      }
    });

    // Remove completed animations (in reverse to avoid index shifting)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.dyingEntities.splice(toRemove[i], 1);
    }
  }

  stop(): void {
    // Clean up event listeners and dying entities
    this.dyingEntities = [];
  }

  static queries = {
    withHealth: {
      components: [Health]
    }
  };
}

