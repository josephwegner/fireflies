import { System } from 'ecsy';
import Phaser from 'phaser';
import { gameEvents } from '@/events';
import { Position, MonsterTag } from '@/ecs/components';

export class ParticleEffectsSystem extends System {
  private scene!: Phaser.Scene;
  private graphics!: Phaser.GameObjects.Graphics;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
  }

  init(attributes?: any): void {
    if (attributes?.scene) {
      this.scene = attributes.scene;
      this.graphics = this.scene.add.graphics();
      this.graphics.setDepth(60); // Render above entities but below UI
      this.setupEventListeners();
    }
  }

  static queries = {};

  execute(delta: number, time: number): void {
    // Particle effects are event-driven, no per-frame logic needed
  }

  private setupEventListeners(): void {
    // Firefly lodging effect (arriving at wisp)
    gameEvents.on('tenant:addedToLodge', (data: any) => {
      const position = data.tenantEntity.getComponent(Position);
      if (position) {
        this.createLightBurst(position.x, position.y, 0xDEF4B4);
      }
    });

    // Monster defeat effect
    gameEvents.on('entity:died', (data: any) => {
      if (data.position && data.entity.hasComponent(MonsterTag)) {
        this.createGeometricDispersion(data.position.x, data.position.y, 0xC65D3B);
      }
    });
  }

  private createLightBurst(x: number, y: number, color: number): void {
    // Create expanding circle of light particles
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
    // Create geometric shapes dispersing outward
    const shapeCount = 8;
    const radius = 40;
    
    for (let i = 0; i < shapeCount; i++) {
      const angle = (i / shapeCount) * Math.PI * 2;
      const targetX = x + Math.cos(angle) * radius;
      const targetY = y + Math.sin(angle) * radius;
      
      // Alternate between different geometric shapes
      const shapeType = i % 3;
      this.animateGeometricParticle(x, y, targetX, targetY, color, 400, shapeType);
    }
  }

  private animateParticle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: number,
    duration: number
  ): void {
    const particle = this.scene.add.circle(startX, startY, 3, color);
    particle.setAlpha(0.8);
    particle.setDepth(60);
    particle.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: particle,
      x: endX,
      y: endY,
      alpha: 0,
      scale: 0.3,
      duration: duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        particle.destroy();
      }
    });
  }

  private animateGeometricParticle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: number,
    duration: number,
    shapeType: number
  ): void {
    let particle: Phaser.GameObjects.Shape;
    
    switch (shapeType) {
      case 0:
        // Square
        particle = this.scene.add.rectangle(startX, startY, 6, 6, color);
        break;
      case 1:
        // Triangle
        particle = this.scene.add.triangle(startX, startY, 0, 6, 3, 0, 6, 6, color);
        break;
      case 2:
      default:
        // Circle
        particle = this.scene.add.circle(startX, startY, 3, color);
        break;
    }
    
    particle.setAlpha(0.9);
    particle.setDepth(60);
    particle.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: particle,
      x: endX,
      y: endY,
      alpha: 0,
      rotation: Math.PI * 2,
      scale: 0.2,
      duration: duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        particle.destroy();
      }
    });
  }
}

