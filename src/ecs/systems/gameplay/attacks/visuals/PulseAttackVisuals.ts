import Phaser from 'phaser';
import { AttackContext } from '../AttackHandler';

interface VisualObject {
  object: Phaser.GameObjects.GameObject;
  destroy: () => void;
}

export class PulseAttackVisuals {
  private rings: Phaser.GameObjects.Graphics[] = [];
  private particles: Phaser.GameObjects.Shape[] = [];
  private bloomGraphics: Phaser.GameObjects.Graphics | null = null;
  private chargingParticles: Array<{
    shape: Phaser.GameObjects.Shape;
    tween: any;
  }> = [];

  charging(context: AttackContext, progress: number): void {
    const { scene, spriteContainer, combat, renderable } = context;
    if (!scene || !spriteContainer) return;

    const attackRadius = combat.attackPattern.radius || 40;
    const attackColor = combat.attackPattern.color ?? 0xff0000;

    // Store original tint on first frame
    if (progress === 0 && renderable) {
      (spriteContainer as any).originalTint = renderable.tint;
    }

    // Increase glow on attacker sprite
    if (renderable) {
      const glowIntensity = 0.2 + (progress * 0.5);
      const r = Math.min(255, Math.floor(((attackColor >> 16) & 0xFF) * glowIntensity));
      const g = Math.min(255, Math.floor(((attackColor >> 8) & 0xFF) * glowIntensity));
      const b = Math.min(255, Math.floor((attackColor & 0xFF) * glowIntensity));
      renderable.tint = (r << 16) | (g << 8) | b;
    }

    // Create/update converging rings
    this.updateConvergingRings(scene, spriteContainer, progress, attackRadius, attackColor);

    // Spawn drifting particles periodically
    if (Math.random() < 0.3) {
      this.spawnDriftingParticle(scene, spriteContainer, attackRadius, attackColor);
    }
  }

  private updateConvergingRings(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    progress: number,
    maxRadius: number,
    color: number
  ): void {
    const ringCount = 4;

    // Clear existing rings if any
    this.rings.forEach(ring => {
      if (ring.scene) ring.destroy();
    });
    this.rings = [];

    const outwardPulseRadius = Math.min(maxRadius, 0.75 + (maxRadius * progress));

    // Tuning constants for pulse distance calculation
    // PULSE_SCALE: Controls how much rings pulse inward (higher = more movement)
    // MAX_PULSE_PERCENT: Maximum percentage of radius that rings can pulse (safety cap)
    const PULSE_SCALE = 10;
    const MAX_PULSE_PERCENT = 0.2;
    
    // Create 4 concentric rings that pulse inward as charge builds
    // Logarithmic scaling with a cap ensures consistent animation across all entity sizes
    // Small entities get appropriate movement, large entities don't get excessive movement
    const logBasedPulse = Math.log(outwardPulseRadius) * PULSE_SCALE;
    const maxAllowedPulse = outwardPulseRadius * MAX_PULSE_PERCENT;
    const pulseDistance = Math.min(logBasedPulse, maxAllowedPulse);
    
    for (let i = 0; i < ringCount; i++) {
      const ring = scene.add.graphics();
      ring.name = `chargingRing_${i}`;
      
      // Each ring is evenly distributed across the radius
      const ringBaseRadius = (outwardPulseRadius / (ringCount + 1)) * (i + 1);
      
      // Each ring has a slight timing offset for organic wave effect
      const timeOffset = i * 0.15;
      const ringProgress = Math.min(1, progress + timeOffset);
      
      // Pulse inward linearly from base radius as charge builds
      // Clamp to prevent negative radius (rings can't shrink past center)
      const targetRadius = ringBaseRadius - (pulseDistance * ringProgress);
      const currentRadius = Math.max(1, targetRadius);
      
      // Fade rings as they pulse inward for depth effect
      const alpha = (ringProgress * 0.5);
      
      ring.lineStyle(2, color, alpha);
      ring.strokeCircle(0, 0, currentRadius);
      
      container.add(ring);
      this.rings.push(ring);
    }
  }

  private spawnDriftingParticle(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    maxRadius: number,
    color: number
  ): void {
    // Random position on circle edge
    const angle = Math.random() * Math.PI * 2;
    const startX = Math.cos(angle) * maxRadius;
    const startY = Math.sin(angle) * maxRadius;

    // Random shape type
    const shapeType = Math.floor(Math.random() * 3);
    let particle: Phaser.GameObjects.Shape;

    switch (shapeType) {
      case 0:
        particle = scene.add.circle(startX, startY, 2, color);
        break;
      case 1:
        particle = scene.add.rectangle(startX, startY, 4, 4, color);
        break;
      case 2:
      default:
        particle = scene.add.triangle(startX, startY, 0, 4, 2, 0, 4, 4, color);
        break;
    }

    particle.setAlpha(0.7);
    particle.setDepth(60);
    particle.setBlendMode(Phaser.BlendModes.ADD);
    container.add(particle);
    this.particles.push(particle);

    // Animate toward center
    const tween = scene.tweens.add({
      targets: particle,
      x: 0,
      y: 0,
      alpha: 0,
      scale: 0.5,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (particle.scene) {
          particle.destroy();
        }
        const index = this.particles.indexOf(particle);
        if (index > -1) {
          this.particles.splice(index, 1);
        }
      }
    });

    this.chargingParticles.push({ shape: particle, tween });
  }

  burst(context: AttackContext): void {
    const { scene, spriteContainer, combat } = context;
    if (!scene || !spriteContainer) return;

    const maxRadius = combat.attackPattern.radius || 40;
    const attackColor = combat.attackPattern.color ?? 0xff0000;

    this.clearRings();

    // Create bloom flash at center
    this.createBloomFlash(scene, spriteContainer, attackColor);

    // Create expanding shockwave rings
    this.createShockwaveRings(scene, spriteContainer, maxRadius, attackColor);
  }

  private clearRings(): void {
    this.rings.forEach(ring => {
      if (ring.scene) ring.destroy();
    });
    this.rings = [];
  }

  private createBloomFlash(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    color: number
  ): void {
    const bloom = scene.add.graphics();
    bloom.name = 'bloomFlash';
    
    // Draw radial gradient effect using concentric circles
    for (let i = 0; i < 5; i++) {
      const radius = (i + 1) * 5;
      const alpha = 0.8 - (i * 0.15);
      bloom.fillStyle(color, alpha);
      bloom.fillCircle(0, 0, radius);
    }

    bloom.setBlendMode(Phaser.BlendModes.ADD as any);
    container.add(bloom);
    this.bloomGraphics = bloom;

    // Fade out bloom quickly
    scene.tweens.add({
      targets: bloom,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (bloom.scene) {
          bloom.destroy();
        }
        this.bloomGraphics = null;
      }
    });
  }

  private createShockwaveRings(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    maxRadius: number,
    color: number
  ): void {
    const ringCount = 4;

    for (let i = 0; i < ringCount; i++) {
      const ring = scene.add.graphics();
      ring.name = `shockwaveRing_${i}`;
      ring.setBlendMode(Phaser.BlendModes.ADD as any);
      container.add(ring);
      // Don't add to this.rings - shockwave rings are self-managing via tweens

      // Each ring has a time offset for the ripple effect
      const delay = i * 50;

      scene.tweens.add({
        targets: ring,
        alpha: { from: 1, to: 0 },
        duration: 400,
        delay,
        ease: 'Cubic.easeOut',
        onUpdate: (tween: any) => {
          const progress = tween.progress;
          const currentRadius = maxRadius * progress;
          const alpha = 1 - progress;
          
          ring.clear();
          ring.lineStyle(2, color, alpha);
          ring.strokeCircle(0, 0, currentRadius * 1.5);
        },
        onComplete: () => {
          // Tween manages its own cleanup when animation completes
          if (ring.scene) {
            ring.destroy();
          }
        }
      });
    }
  }

  recovery(context: AttackContext, progress: number): void {
    const { renderable, spriteContainer } = context;
    if (!renderable) return;

    // Gradually return to original tint
    const originalTint = (spriteContainer as any)?.originalTint ?? 0xFFFFFF;
    const currentR = (renderable.tint >> 16) & 0xFF;
    const currentG = (renderable.tint >> 8) & 0xFF;
    const currentB = renderable.tint & 0xFF;

    const targetR = (originalTint >> 16) & 0xFF;
    const targetG = (originalTint >> 8) & 0xFF;
    const targetB = originalTint & 0xFF;

    const r = Math.floor(currentR + (targetR - currentR) * progress * 0.1);
    const g = Math.floor(currentG + (targetG - currentG) * progress * 0.1);
    const b = Math.floor(currentB + (targetB - currentB) * progress * 0.1);

    renderable.tint = (r << 16) | (g << 8) | b;

    // Return scale to 1.0
    const currentScale = renderable.scale;
    renderable.scale = currentScale + (1.0 - currentScale) * progress * 0.1;
  }

  cleanup(): void {
    this.clearRings();

    // Destroy all particles
    this.particles.forEach(particle => {
      if (particle.scene) {
        particle.destroy();
      }
    });
    this.particles = [];

    // Destroy bloom if it exists
    if (this.bloomGraphics && this.bloomGraphics.scene) {
      this.bloomGraphics.destroy();
      this.bloomGraphics = null;
    }

    // Clean up charging particles
    this.chargingParticles.forEach(({ shape, tween }) => {
      if (tween) {
        tween.stop();
        tween.remove();
      }
      if (shape.scene) {
        shape.destroy();
      }
    });
    this.chargingParticles = [];
  }
}

