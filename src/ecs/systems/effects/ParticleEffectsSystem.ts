import Phaser from 'phaser';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { GameSystemBase, type SystemConfig } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';

export class ParticleEffectsSystem extends GameSystemBase {
  private scene: Phaser.Scene;

  constructor(_world: GameWorld, config: Pick<SystemConfig, 'scene'>) {
    super();
    this.scene = config.scene;

    this.listen(GameEvents.TENANT_ADDED_TO_LODGE, this.handleTenantAdded);
    this.listen(GameEvents.ENTITY_DIED, this.handleEntityDied);
  }

  update(_delta: number, _time: number): void {
    // Particle effects are event-driven
  }

  private handleTenantAdded(data: { lodgeEntity: Entity; tenantEntity: Entity }): void {
    const position = data.tenantEntity.position;
    if (position) {
      this.createLightBurst(position.x, position.y, 0xDEF4B4);
    }
  }

  private handleEntityDied(data: { entity: Entity; position: { x: number; y: number } }): void {
    if (data.position && data.entity.team === 'monster') {
      this.createGeometricDispersion(data.position.x, data.position.y, 0xC65D3B);
    }
    if (data.position && data.entity.physicsBody?.isStatic) {
      const color = data.entity.renderable?.glow?.color ?? 0xB0C4DE;
      this.createLightBurst(data.position.x, data.position.y, color);
    }
  }

  private createLightBurst(x: number, y: number, color: number): void {
    const particleCount = 12;
    const radius = 30;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const targetX = x + Math.cos(angle) * radius;
      const targetY = y + Math.sin(angle) * radius;
      this.animateParticle(x, y, targetX, targetY, color, 300);
    }
  }

  private createGeometricDispersion(x: number, y: number, color: number): void {
    const shapeCount = 8;
    const radius = 40;

    for (let i = 0; i < shapeCount; i++) {
      const angle = (i / shapeCount) * Math.PI * 2;
      const targetX = x + Math.cos(angle) * radius;
      const targetY = y + Math.sin(angle) * radius;
      const shapeType = i % 3;
      this.animateGeometricParticle(x, y, targetX, targetY, color, 400, shapeType);
    }
  }

  private animateParticle(
    startX: number, startY: number,
    endX: number, endY: number,
    color: number, duration: number
  ): void {
    const particle = this.scene.add.circle(startX, startY, 3, color);
    particle.setAlpha(0.8);
    particle.setDepth(60);
    particle.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: particle,
      x: endX, y: endY,
      alpha: 0, scale: 0.3,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy()
    });
  }

  private animateGeometricParticle(
    startX: number, startY: number,
    endX: number, endY: number,
    color: number, duration: number,
    shapeType: number
  ): void {
    let particle: Phaser.GameObjects.Shape;

    switch (shapeType) {
      case 0:
        particle = this.scene.add.rectangle(startX, startY, 6, 6, color);
        break;
      case 1:
        particle = this.scene.add.triangle(startX, startY, 0, 6, 3, 0, 6, 6, color);
        break;
      case 2:
      default:
        particle = this.scene.add.circle(startX, startY, 3, color);
        break;
    }

    particle.setAlpha(0.9);
    particle.setDepth(60);
    particle.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: particle,
      x: endX, y: endY,
      alpha: 0, rotation: Math.PI * 2, scale: 0.2,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy()
    });
  }
}
