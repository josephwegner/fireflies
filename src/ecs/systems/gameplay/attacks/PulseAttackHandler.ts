import { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { PhysicsBody, Position } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events/GameEvents';
import { ECSEntity } from '@/types';
import { TagComponent } from 'ecsy';
import Phaser from 'phaser';

export class PulseAttackHandler implements AttackHandler {

  onCharging(context: AttackContext): void {
    const { combat, scene, spriteContainer, target, position, velocity } = context;

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

    // Visual: expanding pulse circle
    if (!scene || !spriteContainer) return;

    // Find or create pulse circle in the container
    let pulseCircle = spriteContainer.list.find((c: any) => c.name === 'pulseCircle') as Phaser.GameObjects.Graphics | undefined;
    
    if (!pulseCircle) {
      pulseCircle = scene.add.graphics();
      pulseCircle.name = 'pulseCircle';
      spriteContainer.add(pulseCircle);
    }

    // Draw expanding circle
    pulseCircle.clear();
    const maxRadius = combat.attackPattern.radius || 40;
    const currentRadius = maxRadius * clampedProgress;
    const alpha = 0.3 * (1 - clampedProgress * 0.5); // Fade as it expands
    
    pulseCircle.lineStyle(2, 0xff0000, alpha);
    pulseCircle.fillStyle(0xff0000, 0.2);
    pulseCircle.fillCircle(0, 0, currentRadius);
    pulseCircle.strokeCircle(0, 0, currentRadius);
  }

  onAttackStart(context: AttackContext): void {
    // Pulse attacks expand instantly at the attacker's position
    // No movement setup needed like dash attacks
  }

  execute({ attacker, combat, world, spatialGrid, scene, spriteContainer, position }: AttackContext): void {
    // Only hit once per attack
    if (combat.hasHit) return;
    
    const attackerPos = attacker.getComponent(Position);
    if (!attackerPos) return;

    // Visual: Expand circle to full radius with bright flash
    if (spriteContainer && scene && position) {
      let pulseCircle = spriteContainer.list.find((c: any) => c.name === 'pulseCircle') as Phaser.GameObjects.Graphics | undefined;
      
      if (pulseCircle) {
        pulseCircle.clear();
        const maxRadius = combat.attackPattern.radius || 40;
        
        // Full size, bright flash
        pulseCircle.lineStyle(3, 0xff0000, 0.3);
        pulseCircle.strokeCircle(0, 0, maxRadius);
        pulseCircle.fillStyle(0xff0000, 0.3);
        pulseCircle.fillCircle(0, 0, maxRadius);
      }
    }

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
    const { combat, renderable, spriteContainer, dt } = context;
    if (!renderable || !dt) return;

    const progress = combat.recoveryElapsed / combat.attackPattern.recoveryTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Scale gradually returns to 1.0
    const currentScale = renderable.scale;
    renderable.scale = currentScale + (1.0 - currentScale) * clampedProgress * 0.1;

    // Tint gradually returns to white
    const currentR = (renderable.tint >> 16) & 0xFF;
    const currentG = (renderable.tint >> 8) & 0xFF;
    const currentB = renderable.tint & 0xFF;

    const targetR = 255;
    const targetG = 255;
    const targetB = 255;

    const r = Math.floor(currentR + (targetR - currentR) * clampedProgress * 0.1);
    const g = Math.floor(currentG + (targetG - currentG) * clampedProgress * 0.1);
    const b = Math.floor(currentB + (targetB - currentB) * clampedProgress * 0.1);

    renderable.tint = (r << 16) | (g << 8) | b;

    // Fade out the pulse circle from container
    if (spriteContainer) {
      const pulseCircle = spriteContainer.list.find((c: any) => c.name === 'pulseCircle') as Phaser.GameObjects.Graphics | undefined;
      if (pulseCircle) {
        pulseCircle.setAlpha(1 - clampedProgress);
      }
    }
  }

  cleanup(context: AttackContext): void {
    const { renderable, spriteContainer } = context;

    // Destroy pulse circle graphic from container
    if (spriteContainer) {
      const pulseCircle = spriteContainer.list.find((c: any) => c.name === 'pulseCircle') as Phaser.GameObjects.Graphics | undefined;
      if (pulseCircle) {
        // Check if it hasn't already been destroyed
        if (pulseCircle.scene) {
          pulseCircle.destroy();
        }
      }
    }

    // Reset visual properties
    if (renderable) {
      renderable.scale = 1.0;
      renderable.tint = 0xFFFFFF;
    }
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
