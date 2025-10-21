import { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { PhysicsBody, Position } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events/GameEvents';
import { ECSEntity } from '@/types';
import { TagComponent } from 'ecsy';
import Phaser from 'phaser';

export class PulseAttackHandler implements AttackHandler {

  onCharging(context: AttackContext): void {
    const { combat, renderable, scene, spriteContainer, position } = context;
    if (!renderable || !scene || !spriteContainer || !position) return;

    const progress = combat.chargeTime / combat.attackPattern.chargeTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Oscillating scale between 0.9 and 1.1
    const scaleOscillation = Math.sin(progress * Math.PI * 6) * 0.1;
    renderable.scale = 1.0 + scaleOscillation;

    // Red glow pulse - intensifies as charge progresses
    const pulseIntensity = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
    const redValue = Math.floor(255);
    const otherValue = Math.floor(255 * (1 - clampedProgress * 0.5) * (0.8 + pulseIntensity * 0.2));
    renderable.tint = (redValue << 16) | (otherValue << 8) | otherValue;

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
    const currentRadius = maxRadius * clampedProgress * 0.8; // Expand to 80% during charge
    const alpha = 0.3 * (1 - clampedProgress * 0.5); // Fade as it expands
    
    pulseCircle.lineStyle(2, 0xff0000, alpha);
    pulseCircle.strokeCircle(position.x, position.y, currentRadius);
  }

  onAttackStart(context: AttackContext): void {
    // Pulse attacks expand instantly at the attacker's position
    // No movement setup needed like dash attacks
  }

  execute({ attacker, combat, world, spatialGrid, scene, spriteContainer, position }: AttackContext): void {
    const attackerPos = attacker.getComponent(Position);
    if (!attackerPos) return;

    // Visual: Expand circle to full radius with bright flash
    if (spriteContainer && scene && position) {
      let pulseCircle = spriteContainer.list.find((c: any) => c.name === 'pulseCircle') as Phaser.GameObjects.Graphics | undefined;
      
      if (pulseCircle) {
        pulseCircle.clear();
        const maxRadius = combat.attackPattern.radius || 40;
        
        // Full size, bright flash
        pulseCircle.lineStyle(3, 0xff0000, 0.8);
        pulseCircle.strokeCircle(position.x, position.y, maxRadius);
        pulseCircle.fillStyle(0xff0000, 0.2);
        pulseCircle.fillCircle(position.x, position.y, maxRadius);
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
