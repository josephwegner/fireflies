import type { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { gameEvents, GameEvents } from '@/events/GameEvents';
import type { Entity } from '@/ecs/Entity';

export class PulseAttackHandler implements AttackHandler {
  onCharging(context: AttackContext): void {
    const { combat, target, position, velocity } = context;

    const progress = combat.chargeTime / combat.attackPattern.chargeTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Move towards target while maintaining optimal distance
    if (target && position && velocity) {
      const targetPos = target.position;
      if (targetPos) {
        const dx = targetPos.x - position.x;
        const dy = targetPos.y - position.y;
        const distanceToTarget = Vector.length(dx, dy);

        const attackRadius = combat.attackPattern.radius || 40;
        const optimalDistance = attackRadius * 0.5;
        const tolerance = 2;

        if (Math.abs(distanceToTarget - optimalDistance) > tolerance) {
          const direction = Vector.normalize(dx, dy);
          const moveSpeed = 16 * (0.2 + clampedProgress * 0.6);
          const shouldMoveCloser = distanceToTarget > optimalDistance;
          const directionMultiplier = shouldMoveCloser ? 1 : -1;

          velocity.vx = direction.x * moveSpeed * directionMultiplier;
          velocity.vy = direction.y * moveSpeed * directionMultiplier;
        } else {
          velocity.vx *= 0.8;
          velocity.vy *= 0.8;
        }
      }
    }
    // Visual charging handled by CombatVisualsSystem via events
  }

  onAttackStart(_context: AttackContext): void {
    // Pulse attacks expand instantly, no movement setup needed
  }

  execute(context: AttackContext): void {
    const { attacker, combat, spatialGrid } = context;

    if (combat.hasHit) return;

    const attackerPos = attacker.position;
    if (!attackerPos) return;

    const radius = combat.attackPattern.radius ?? 0;
    const entitiesToCheck = spatialGrid
      ? spatialGrid.getNearby(attackerPos.x, attackerPos.y, radius)
      : [];

    for (const entity of entitiesToCheck) {
      if (entity === attacker) continue;
      if (!entity.position || !entity.physicsBody) continue;
      if (!this.isValidTarget(entity, attacker)) continue;

      const dx = entity.position.x - attackerPos.x;
      const dy = entity.position.y - attackerPos.y;
      const distance = Vector.length(dx, dy);

      const targetRadius = entity.physicsBody?.collisionRadius ?? 0;
      if (distance <= radius + targetRadius) {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: entity,
          damage: combat.attackPattern.damage,
          knockbackForce: combat.attackPattern.knockbackForce,
        });
      }
    }

    combat.hasHit = true;
  }

  onRecovering(_context: AttackContext): void {
    // Visual recovery handled by CombatVisualsSystem via events
  }

  cleanup(_context: AttackContext): void {
    // Visual cleanup handled by CombatVisualsSystem via events
  }

  private isValidTarget(entity: Entity, attacker: Entity): boolean {
    if (!entity.team || !attacker.team) return false;
    return entity.team !== attacker.team;
  }
}
