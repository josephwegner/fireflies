import { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { PhysicsBody, Position } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events/GameEvents';
import { ECSEntity } from '@/types';
import { TagComponent } from 'ecsy';
import Phaser from 'phaser';
import { PulseAttackVisuals } from './visuals/PulseAttackVisuals';

export class PulseAttackHandler implements AttackHandler {
  private visuals = new PulseAttackVisuals();

  onCharging(context: AttackContext): void {
    const { combat, target, position, velocity } = context;

    const progress = combat.chargeTime / combat.attackPattern.chargeTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Move towards target while maintaining optimal distance
    if (target && position && velocity) {
      const targetPos = target.getComponent(Position);
      if (targetPos) {
        const dx = targetPos.x - position.x;
        const dy = targetPos.y - position.y;
        const distanceToTarget = Vector.length(dx, dy);
        
        // Optimal distance is half the attack radius
        const attackRadius = combat.attackPattern.radius || 40;
        const optimalDistance = attackRadius * 0.5;
        const tolerance = 2; // Small buffer to avoid jittering
        
        // Only move if we're not at optimal distance
        if (Math.abs(distanceToTarget - optimalDistance) > tolerance) {
          const direction = Vector.normalize(dx, dy);
          
          // Speed increases as charge progresses (start slow, end at 80% normal speed)
          const moveSpeed = 16 * (0.2 + clampedProgress * 0.6);
          
          // If too close, move away (negative direction)
          // If too far, move closer (positive direction)
          const shouldMoveCloser = distanceToTarget > optimalDistance;
          const directionMultiplier = shouldMoveCloser ? 1 : -1;
          
          velocity.vx = direction.x * moveSpeed * directionMultiplier;
          velocity.vy = direction.y * moveSpeed * directionMultiplier;
        } else {
          // At optimal distance, slow down to a stop
          velocity.vx *= 0.8;
          velocity.vy *= 0.8;
        }
      }
    }

    // Delegate visual effects to visuals class
    this.visuals.charging(context, clampedProgress);
  }

  onAttackStart(context: AttackContext): void {
    // Pulse attacks expand instantly at the attacker's position
    // No movement setup needed like dash attacks
  }

  execute(context: AttackContext): void {
    const { attacker, combat, world, spatialGrid } = context;
    
    // Only hit once per attack
    if (combat.hasHit) return;
    
    const attackerPos = attacker.getComponent(Position);
    if (!attackerPos) return;

    // Delegate visual burst effect to visuals class
    this.visuals.burst(context);

    // Use spatial grid if available, otherwise fall back to all entities
    const entitiesToCheck = spatialGrid
      ? spatialGrid.getNearby(attackerPos.x, attackerPos.y, combat.attackPattern.radius ?? 0)
      : Array.from((world.entityManager as any)._entities);

    entitiesToCheck.forEach((entity: ECSEntity) => {
      // Don't hit self
      if (entity === attacker) return;
      
      // Only consider entities with Position and PhysicsBody
      if (!entity.hasComponent(Position) || !entity.hasComponent(PhysicsBody)) return;
      
      if (!this.isValidTarget(entity, combat.attackPattern.targetTags)) return;

      const targetPos = entity.getComponent(Position);
      if (!targetPos) return;

      const dx = targetPos.x - attackerPos.x;
      const dy = targetPos.y - attackerPos.y;
      const distance = Vector.length(dx, dy);

      if (distance <= (combat.attackPattern.radius ?? 0)) {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: entity,
          damage: combat.attackPattern.damage,
          knockbackForce: combat.attackPattern.knockbackForce,
        });
      }
    });

    // Pulse only hits once
    combat.hasHit = true;
  }

  onRecovering(context: AttackContext): void {
    const { combat } = context;

    const progress = combat.recoveryElapsed / combat.attackPattern.recoveryTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Delegate visual recovery to visuals class
    this.visuals.recovery(context, clampedProgress);
  }

  cleanup(context: AttackContext): void {
    const { renderable, spriteContainer } = context;
    
    // Restore original tint and reset scale
    if (renderable && spriteContainer) {
      const container = spriteContainer as any;
      
      // Restore original tint
      if (container.originalTint !== undefined) {
        renderable.tint = container.originalTint;
        delete container.originalTint;
      }
      
      // Reset scale
      renderable.scale = 1.0;
    }

    // Delegate cleanup of all visual objects to visuals class
    this.visuals.cleanup();
  }

  private isValidTarget(
    entity: ECSEntity,
    targetTags: string[] = []
  ): boolean {
    if (targetTags.length === 0) return true;

    return Object.values(entity.getComponents())
      .some(
        c =>
          c instanceof TagComponent &&
          targetTags.includes(c.constructor.name.replace(/Tag$/, '').toLowerCase())
      );
  }
}
