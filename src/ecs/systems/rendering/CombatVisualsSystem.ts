import Phaser from 'phaser';
import type { Entity, GameWorld, AttackPattern } from '@/ecs/Entity';
import { GameSystemBase } from '@/ecs/GameSystem';
import type { RenderingSystem } from './RenderingSystem';
import { gameEvents, GameEvents } from '@/events';

const PULSE_CHARGING_RING_COUNT = 4;

interface ActiveVisual {
  rings: Phaser.GameObjects.Graphics[];
  particles: Phaser.GameObjects.Shape[];
  bloomGraphics: Phaser.GameObjects.Graphics | null;
  chargingParticles: Array<{ shape: Phaser.GameObjects.Shape; tween: Phaser.Tweens.Tween }>;
  originalTint?: number;
}

export class CombatVisualsSystem extends GameSystemBase {
  private scene: Phaser.Scene;
  private renderingSystem: RenderingSystem;
  private activeVisuals = new Map<Entity, ActiveVisual>();

  constructor(_world: GameWorld, config: Record<string, any>) {
    super();
    this.scene = config.scene;
    this.renderingSystem = config.renderingSystem;

    this.listen(GameEvents.COMBAT_CHARGING, this.handleCharging);
    this.listen(GameEvents.COMBAT_ATTACK_BURST, this.handleBurst);
    this.listen(GameEvents.COMBAT_RECOVERING, this.handleRecovering);
    this.listen(GameEvents.COMBAT_CLEANUP, this.handleCleanup);
  }

  destroy(): void {
    super.destroy();

    for (const [, visual] of this.activeVisuals) {
      this.destroyVisual(visual);
    }
    this.activeVisuals.clear();
  }

  update(_delta: number, _time: number): void {}

  private getOrCreateVisual(entity: Entity): ActiveVisual {
    let visual = this.activeVisuals.get(entity);
    if (!visual) {
      visual = {
        rings: [],
        particles: [],
        bloomGraphics: null,
        chargingParticles: [],
      };
      this.activeVisuals.set(entity, visual);
    }
    return visual;
  }

  private handleCharging(data: { entity: Entity; attackPattern: AttackPattern; progress: number }): void {
    const { entity, attackPattern, progress } = data;
    const container = this.renderingSystem.getSpriteForEntity(entity);
    if (!container) return;

    const visual = this.getOrCreateVisual(entity);
    const attackRadius = attackPattern.radius || 40;
    const attackColor = attackPattern.color ?? 0xff0000;

    if (attackPattern.handlerType === 'pulse') {
      this.handlePulseCharging(entity, visual, container, progress, attackRadius, attackColor);
    }
  }

  private handlePulseCharging(
    entity: Entity,
    visual: ActiveVisual,
    container: Phaser.GameObjects.Container,
    progress: number,
    attackRadius: number,
    attackColor: number
  ): void {
    if (progress === 0 && entity.renderable) {
      visual.originalTint = entity.renderable.tint;
    }

    if (entity.renderable) {
      const glowIntensity = 0.2 + (progress * 0.5);
      const r = Math.min(255, Math.floor(((attackColor >> 16) & 0xFF) * glowIntensity));
      const g = Math.min(255, Math.floor(((attackColor >> 8) & 0xFF) * glowIntensity));
      const b = Math.min(255, Math.floor((attackColor & 0xFF) * glowIntensity));
      entity.renderable.tint = (r << 16) | (g << 8) | b;
    }

    this.updateConvergingRings(visual, container, progress, attackRadius, attackColor);

    if (Math.random() < 0.3) {
      this.spawnDriftingParticle(visual, container, attackRadius, attackColor);
    }
  }

  private updateConvergingRings(
    visual: ActiveVisual,
    container: Phaser.GameObjects.Container,
    progress: number,
    maxRadius: number,
    color: number
  ): void {
    const ringCount = PULSE_CHARGING_RING_COUNT;

    visual.rings.forEach(ring => {
      if (ring.scene) ring.destroy();
    });
    visual.rings = [];

    const outwardPulseRadius = Math.min(maxRadius, 0.75 + (maxRadius * progress));
    const PULSE_SCALE = 10;
    const MAX_PULSE_PERCENT = 0.2;
    const logBasedPulse = Math.log(outwardPulseRadius) * PULSE_SCALE;
    const maxAllowedPulse = outwardPulseRadius * MAX_PULSE_PERCENT;
    const pulseDistance = Math.min(logBasedPulse, maxAllowedPulse);

    for (let i = 0; i < ringCount; i++) {
      const ring = this.scene.add.graphics();
      const ringBaseRadius = (outwardPulseRadius / (ringCount + 1)) * (i + 1);
      const timeOffset = i * 0.15;
      const ringProgress = Math.min(1, progress + timeOffset);
      const targetRadius = ringBaseRadius - (pulseDistance * ringProgress);
      const currentRadius = Math.max(1, targetRadius);
      const alpha = ringProgress * 0.5;

      ring.lineStyle(2, color, alpha);
      ring.strokeCircle(0, 0, currentRadius);

      container.add(ring);
      visual.rings.push(ring);
    }
  }

  private spawnDriftingParticle(
    visual: ActiveVisual,
    container: Phaser.GameObjects.Container,
    maxRadius: number,
    color: number
  ): void {
    const angle = Math.random() * Math.PI * 2;
    const startX = Math.cos(angle) * maxRadius;
    const startY = Math.sin(angle) * maxRadius;

    const shapeType = Math.floor(Math.random() * 3);
    let particle: Phaser.GameObjects.Shape;

    switch (shapeType) {
      case 0:
        particle = this.scene.add.circle(startX, startY, 2, color);
        break;
      case 1:
        particle = this.scene.add.rectangle(startX, startY, 4, 4, color);
        break;
      case 2:
      default:
        particle = this.scene.add.triangle(startX, startY, 0, 4, 2, 0, 4, 4, color);
        break;
    }

    particle.setAlpha(0.7);
    particle.setDepth(60);
    particle.setBlendMode(Phaser.BlendModes.ADD);
    container.add(particle);
    visual.particles.push(particle);

    const tween = this.scene.tweens.add({
      targets: particle,
      x: 0,
      y: 0,
      alpha: 0,
      scale: 0.5,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (particle.scene) particle.destroy();
        const index = visual.particles.indexOf(particle);
        if (index > -1) visual.particles.splice(index, 1);
      }
    });

    visual.chargingParticles.push({ shape: particle, tween });
  }

  private handleBurst(data: { entity: Entity; attackPattern: AttackPattern; position: { x: number; y: number } }): void {
    const { entity, attackPattern } = data;
    const container = this.renderingSystem.getSpriteForEntity(entity);
    if (!container) return;

    const visual = this.getOrCreateVisual(entity);
    const maxRadius = attackPattern.radius || 40;
    const attackColor = attackPattern.color ?? 0xff0000;

    this.clearRings(visual);
    this.createBloomFlash(visual, container, attackColor);
    this.createShockwaveRings(container, maxRadius, attackColor);
  }

  private clearRings(visual: ActiveVisual): void {
    visual.rings.forEach(ring => {
      if (ring.scene) ring.destroy();
    });
    visual.rings = [];
  }

  private createBloomFlash(
    visual: ActiveVisual,
    container: Phaser.GameObjects.Container,
    color: number
  ): void {
    const bloom = this.scene.add.graphics();

    for (let i = 0; i < 5; i++) {
      const radius = (i + 1) * 5;
      const alpha = 0.8 - (i * 0.15);
      bloom.fillStyle(color, alpha);
      bloom.fillCircle(0, 0, radius);
    }

    bloom.setBlendMode(Phaser.BlendModes.ADD as any);
    container.add(bloom);
    visual.bloomGraphics = bloom;

    this.scene.tweens.add({
      targets: bloom,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (bloom.scene) bloom.destroy();
        visual.bloomGraphics = null;
      }
    });
  }

  private createShockwaveRings(
    container: Phaser.GameObjects.Container,
    maxRadius: number,
    color: number
  ): void {
    const ringCount = 4;

    for (let i = 0; i < ringCount; i++) {
      const ring = this.scene.add.graphics();
      ring.setBlendMode(Phaser.BlendModes.ADD as any);
      container.add(ring);

      const delay = i * 50;

      this.scene.tweens.add({
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
          if (ring.scene) ring.destroy();
        }
      });
    }
  }

  private handleRecovering(data: { entity: Entity; attackPattern: AttackPattern; progress: number }): void {
    const { entity, progress } = data;
    if (!entity.renderable) return;

    const visual = this.activeVisuals.get(entity);
    const originalTint = visual?.originalTint ?? 0xFFFFFF;

    const currentR = (entity.renderable.tint >> 16) & 0xFF;
    const currentG = (entity.renderable.tint >> 8) & 0xFF;
    const currentB = entity.renderable.tint & 0xFF;

    const targetR = (originalTint >> 16) & 0xFF;
    const targetG = (originalTint >> 8) & 0xFF;
    const targetB = originalTint & 0xFF;

    const r = Math.floor(currentR + (targetR - currentR) * progress * 0.1);
    const g = Math.floor(currentG + (targetG - currentG) * progress * 0.1);
    const b = Math.floor(currentB + (targetB - currentB) * progress * 0.1);

    entity.renderable.tint = (r << 16) | (g << 8) | b;

    const currentScale = entity.renderable.scale;
    entity.renderable.scale = currentScale + (1.0 - currentScale) * progress * 0.1;
  }

  private handleCleanup(data: { entity: Entity; attackPattern: AttackPattern }): void {
    const { entity } = data;
    const visual = this.activeVisuals.get(entity);
    if (!visual) return;

    if (entity.renderable && visual.originalTint !== undefined) {
      entity.renderable.tint = visual.originalTint;
      entity.renderable.scale = 1.0;
    }

    this.destroyVisual(visual);
    this.activeVisuals.delete(entity);
  }

  private destroyVisual(visual: ActiveVisual): void {
    visual.rings.forEach(ring => {
      if (ring.scene) ring.destroy();
    });
    visual.rings = [];

    visual.particles.forEach(particle => {
      if (particle.scene) particle.destroy();
    });
    visual.particles = [];

    if (visual.bloomGraphics?.scene) {
      visual.bloomGraphics.destroy();
      visual.bloomGraphics = null;
    }

    visual.chargingParticles.forEach(({ shape, tween }) => {
      if (tween) {
        tween.stop();
        tween.remove();
      }
      if (shape.scene) shape.destroy();
    });
    visual.chargingParticles = [];
  }
}
