import { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { PhysicsBody, Position } from '@/ecs/components';
import { GameEvents, gameEvents } from '@/events/GameEvents';

export class DashAttackHandler implements AttackHandler {
  onAttackStart(context: AttackContext): void {
    const { target, position, velocity, combat } = context;
    const targetPos = target.getComponent(Position);
    if (!targetPos) return;

    // Calculate direction to target
    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const direction = Vector.normalize(dx, dy);

    // Apply dash velocity
    const dashSpeed = combat.attackPattern.dashSpeed || 100;
    velocity.vx = direction.x * dashSpeed;
    velocity.vy = direction.y * dashSpeed;
  }

  execute(context: AttackContext): void {
    const { attacker, target, combat } = context;
    
    // Only hit once per attack
    if (combat.hasHit) return;

    const attackerPos = attacker.getComponent(Position);
    const targetPos = target.getComponent(Position);
    if (!attackerPos || !targetPos) return;

    // Check for collision
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    const attackerRadius = attacker.hasComponent(PhysicsBody) 
      ? attacker.getComponent(PhysicsBody)!.collisionRadius 
      : 5;
    const targetRadius = target.hasComponent(PhysicsBody)
      ? target.getComponent(PhysicsBody)!.collisionRadius
      : 5;

    if (distance <= attackerRadius + targetRadius) {
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: combat.attackPattern.damage,
        knockbackForce: combat.attackPattern.knockbackForce
      });
      combat.hasHit = true;
    }
  }
}
