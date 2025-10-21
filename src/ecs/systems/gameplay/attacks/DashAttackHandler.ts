import { AttackHandler, AttackContext } from './AttackHandler';
import { Vector } from '@/utils';
import { PhysicsBody, Position } from '@/ecs/components';
import { GameEvents, gameEvents } from '@/events/GameEvents';
import Phaser from 'phaser';

export class DashAttackHandler implements AttackHandler {
  private readonly TRAIL_SPAWN_INTERVAL = 50; // ms
  private readonly TRAIL_FADE_DURATION = 300; // ms

  onCharging(context: AttackContext): void {
    const { combat, renderable } = context;
    if (!renderable) return;

    const progress = combat.chargeTime / combat.attackPattern.chargeTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    renderable.scale = 1.0 + (0.15 * clampedProgress);

    // Sine wave brightness pulse
    const pulseIntensity = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
    const brightness = Math.floor(255 * (0.9 + pulseIntensity * 0.1));
    renderable.tint = (brightness << 16) | (brightness << 8) | brightness;
  }

  onAttackStart(context: AttackContext): void {
    const { target, position, velocity, combat } = context;
    const targetPos = target?.getComponent(Position);
    if (!targetPos || !position || !velocity) return;

    // Calculate direction to target
    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const direction = Vector.normalize(dx, dy);

    // Apply dash velocity
    const dashSpeed = combat.attackPattern.dashSpeed || 100;
    velocity.vx = direction.x * dashSpeed;
    velocity.vy = direction.y * dashSpeed;

    // Reset trail tracking (stored in container metadata)
    if (context.spriteContainer) {
      (context.spriteContainer as any).lastTrailTime = 0;
    }
  }

  execute(context: AttackContext): void {
    const { attacker, target, combat, scene, position, renderable, dt, spriteContainer } = context;
    
    // Create trail graphics during attack
    if (scene && position && renderable && dt && spriteContainer) {
      
      const container = spriteContainer as any;
      container.lastTrailTime = (container.lastTrailTime || 0) + dt;
      
      if (container.lastTrailTime >= this.TRAIL_SPAWN_INTERVAL) {
        this.createTrailCircle(scene, spriteContainer, position, renderable);
        container.lastTrailTime = 0;
      }

      this.updateTrailGraphics(spriteContainer, dt);

      // Maintain scale at 1.15 during attack
      renderable.scale = 1.15;
    }

    // Only hit once per attack
    if (combat.hasHit) return;

    const attackerPos = attacker.getComponent(Position);
    const targetPos = target?.getComponent(Position);
    if (!attackerPos || !targetPos) return;

    // Check for collision
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    const attackerRadius = attacker.hasComponent(PhysicsBody) 
      ? attacker.getComponent(PhysicsBody)!.collisionRadius 
      : 5;
    const targetRadius = target?.hasComponent(PhysicsBody)
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
      
      // Bounce back after we hit the target
      if (context.velocity) {
        context.velocity.vx = -context.velocity.vx * 0.5;
        context.velocity.vy = -context.velocity.vy * 0.5;
      }
    }
  }

  onRecovering(context: AttackContext): void {
    const { combat, renderable, dt, spriteContainer } = context;
    if (!renderable || !dt) return;

    const progress = combat.recoveryElapsed / combat.attackPattern.recoveryTime;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Scale down from 1.15 to 0.95, then snap to 1.0 at the end
    if (clampedProgress >= 1.0) {
      renderable.scale = 1.0;
    } else {
      renderable.scale = 1.15 - (clampedProgress * 0.2); // 1.15 -> 0.95
    }

    // Return tint to normal white
    const currentR = (renderable.tint >> 16) & 0xFF;
    const currentG = (renderable.tint >> 8) & 0xFF;
    const currentB = renderable.tint & 0xFF;

    const targetR = 255;
    const targetG = 255;
    const targetB = 255;

    const r = Math.floor(currentR + (targetR - currentR) * clampedProgress);
    const g = Math.floor(currentG + (targetG - currentG) * clampedProgress);
    const b = Math.floor(currentB + (targetB - currentB) * clampedProgress);

    renderable.tint = (r << 16) | (g << 8) | b;

    // Continue updating trail graphics (fade them out)
    if (dt && spriteContainer) {
      this.updateTrailGraphics(spriteContainer, dt);
    }
  }

  cleanup(context: AttackContext): void {
    if (!context) return;
    
    const { renderable, spriteContainer } = context;

    // Destroy all trail graphics from container
    if (spriteContainer) {
      const trails = spriteContainer.list.filter((c: any) => c.name?.startsWith('dashTrail-'));
      trails.forEach((trail: any) => {
        if (trail.scene) {
          trail.destroy();
        }
      });
      
      // Clear trail tracking metadata
      (spriteContainer as any).lastTrailTime = 0;
    }

    // Reset scale and tint
    if (renderable) {
      renderable.scale = 1.0;
      renderable.tint = 0xFFFFFF;
    }
  }

  private createTrailCircle(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    position: Position,
    renderable: { radius: number; color: number }
  ): void {
    const graphic = scene.add.graphics();
    graphic.fillStyle(renderable.color, 0.5);
    graphic.fillCircle(0, 0, renderable.radius * 0.8);
    
    // Store metadata on the graphic itself
    (graphic as any).createdAt = 0;
    (graphic as any).trailAlpha = 0.5;
    
    // Give it a unique name and add to container
    const trailIndex = container.list.filter((c: any) => c.name?.startsWith('dashTrail-')).length;
    graphic.name = `dashTrail-${trailIndex}`;
    container.add(graphic);
  }

  private updateTrailGraphics(container: Phaser.GameObjects.Container, dt: number): void {
    const trails = container.list.filter((c: any) => c.name?.startsWith('dashTrail-'));
    
    trails.forEach((trail: any) => {
      trail.createdAt = (trail.createdAt || 0) + dt;

      // Fade out over TRAIL_FADE_DURATION
      const fadeProgress = trail.createdAt / this.TRAIL_FADE_DURATION;
      trail.trailAlpha = Math.max(0, 0.5 * (1 - fadeProgress));

      if (trail.trailAlpha <= 0 || trail.createdAt >= this.TRAIL_FADE_DURATION) {
        if (trail.scene) {
          trail.destroy();
        }
      } else {
        // Update alpha
        trail.setAlpha(trail.trailAlpha);
      }
    });
  }
}
