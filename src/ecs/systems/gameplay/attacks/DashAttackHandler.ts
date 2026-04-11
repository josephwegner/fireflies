import type { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { gameEvents, GameEvents } from '@/events/GameEvents';

export class DashAttackHandler implements AttackHandler {
  onCharging(_context: AttackContext): void {
    // Visual charging handled by CombatVisualsSystem via events
  }

  onAttackStart(context: AttackContext): void {
    const { target, position, velocity, combat } = context;
    const targetPos = target?.position;
    if (!targetPos || !position || !velocity) return;

    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const direction = Vector.normalize(dx, dy);

    const dashSpeed = combat.attackPattern.dashSpeed || 100;
    velocity.vx = direction.x * dashSpeed;
    velocity.vy = direction.y * dashSpeed;
  }

  execute(context: AttackContext): void {
    const { attacker, target, combat } = context;

    if (combat.hasHit) return;

    const attackerPos = attacker.position;
    const targetPos = target?.position;
    if (!attackerPos || !targetPos) return;

    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    const attackerRadius = attacker.physicsBody?.collisionRadius ?? 5;
    const targetRadius = target?.physicsBody?.collisionRadius ?? 5;

    if (distance <= attackerRadius + targetRadius) {
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: target!,
        damage: combat.attackPattern.damage,
        knockbackForce: combat.attackPattern.knockbackForce
      });
      combat.hasHit = true;

      // Bounce back
      if (context.velocity) {
        context.velocity.vx = -context.velocity.vx * 0.5;
        context.velocity.vy = -context.velocity.vy * 0.5;
      }
    }
  }

  onRecovering(_context: AttackContext): void {
    // Visual recovery handled by CombatVisualsSystem via events
  }

  cleanup(_context: AttackContext): void {
    // Visual cleanup handled by CombatVisualsSystem via events
  }
}
