import { System } from 'ecsy';
import { Health, Position, Renderable, Velocity, Lodge, Path } from '@/ecs/components';
import { MonsterTag, FireflyTag, FleeingToGoalTag } from '@/ecs/components/tags';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG, ENTITY_CONFIG } from '@/config';
import { ECSEntity } from '@/types';
import { Vector } from '@/utils';

interface DyingEntity {
  entity: ECSEntity;
  timeElapsed: number;
}

export class DamageSystem extends System {
  private dyingEntities: DyingEntity[] = [];
  private victoryTriggered = false;

  init(): void {
    // Subscribe to damage events
    gameEvents.on(GameEvents.ATTACK_HIT, this.handleDamage.bind(this));
  }

  execute(delta?: number): void {
    const dt = delta || 16;
    this.processDyingEntities(dt);
  }

  handleDamage(data: { attacker: ECSEntity; target: ECSEntity; damage: number; knockbackForce?: number }): void {
    const { attacker, target, damage, knockbackForce } = data;

    if (!target.hasComponent(Health)) {
      return;
    }

    // Skip damage for entities without Position (they're lodged and protected)
    if (!target.hasComponent(Position)) {
      return;
    }

    const health = target.getMutableComponent(Health)!;

    if (health.isDead) {
      return;
    }

    // Apply damage (ensure it's non-negative and doesn't heal)
    if (damage > 0) {
      health.currentHealth = Math.max(0, health.currentHealth - damage);
    }

    if (health.currentHealth <= 0) {
      this.handleDeath(target);
      
      // Check victory condition after any death
      this.checkVictoryCondition();
      
      return; // Don't apply knockback to dead entities
    }

    if (knockbackForce && knockbackForce > 0) {
      this.applyKnockback(attacker, target, knockbackForce);
    }

    gameEvents.emit(GameEvents.ENTITY_DAMAGED, { entity: target, damage });
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

  private checkVictoryCondition(): void {
    // Don't check again if already triggered
    if (this.victoryTriggered) return;

    // Count living monsters
    const monsters = this.queries.monsters.results;
    const livingMonsters = monsters.filter(monster => {
      const health = monster.getComponent(Health);
      return health && !health.isDead;
    });

    // Victory condition: all monsters are dead
    if (monsters.length > 0 && livingMonsters.length === 0) {
      this.triggerVictory();
    }
  }

  private triggerVictory(): void {
    this.victoryTriggered = true;
    
    gameEvents.emit(GameEvents.ALL_MONSTERS_DEFEATED, {});
    
    // Force all lodged fireflies to leave and flee to goal
    this.evictAllFireflies();
  }

  private evictAllFireflies(): void {
    const lodges = this.queries.lodges.results;
    
    lodges.forEach(lodgeEntity => {
      const lodge = lodgeEntity.getMutableComponent(Lodge)!;
      const lodgePos = lodgeEntity.getComponent(Position)!;
      
      // Make a copy of tenants array since we'll be modifying it
      const tenantsToEvict = [...lodge.tenants];
      
      tenantsToEvict.forEach(tenantEntity => {
        // Remove dead entities from tenants array without further processing
        if (!tenantEntity.alive) {
          const tenantIndex = lodge.tenants.indexOf(tenantEntity);
          if (tenantIndex !== -1) {
            lodge.tenants.splice(tenantIndex, 1);
          }
          return;
        }
        
        // Only evict fireflies
        if (!tenantEntity.hasComponent(FireflyTag)) return;
        
        // Remove from lodge
        const tenantIndex = lodge.tenants.indexOf(tenantEntity);
        if (tenantIndex !== -1) {
          lodge.tenants.splice(tenantIndex, 1);
        }
        
        // Restore movement components
        const tenantRenderable = tenantEntity.getComponent(Renderable);
        if (!tenantRenderable) return;
        
        tenantEntity.addComponent(Position, { 
          x: lodgePos.x, 
          y: lodgePos.y
        });
        tenantEntity.addComponent(Velocity, { vx: 0, vy: 0 });
        
        // Get the entity config for the direction
        const config = ENTITY_CONFIG[tenantRenderable.type as keyof typeof ENTITY_CONFIG];
        const direction = config.direction!;
        
        tenantEntity.addComponent(Path, {
          currentPath: [],
          nextPath: [],
          direction: direction
        });
        
        // Mark as fleeing - this will make them skip intermediate destinations
        tenantEntity.addComponent(FleeingToGoalTag);
      });
    });
  }

  applyKnockback(attacker: ECSEntity, target: ECSEntity, knockbackForce: number): void {
    const attackerPos = attacker.getComponent(Position);
    const targetPos = target.getComponent(Position);
    const targetVelocity = target.getMutableComponent(Velocity);

    if (!attackerPos || !targetPos || !targetVelocity) {
      return;
    }

    // Calculate knockback direction (from attacker to target)
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    if (distance === 0) {
      return;
    }

    // Normalize and apply as velocity impulse
    const direction = Vector.normalize(dx, dy);
    const impulse = Vector.scale(direction, knockbackForce);
    
    // Add knockback impulse to existing velocity
    targetVelocity.vx += impulse.x;
    targetVelocity.vy += impulse.y;

    gameEvents.emit(GameEvents.KNOCKBACK_APPLIED, { entity: target, force: impulse });
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
    },
    monsters: {
      components: [MonsterTag, Health]
    },
    lodges: {
      components: [Lodge, Position]
    }
  };
}

