import { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { PhysicsBody, Position } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events/GameEvents';
import { ECSEntity } from '@/types';
import { TagComponent } from 'ecsy';

export class PulseAttackHandler implements AttackHandler {
  execute({ attacker, combat, world, spatialGrid }: AttackContext): void {
    const attackerPos = attacker.getComponent(Position);
    if (!attackerPos) return;

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
