import type { Query, With } from 'miniplex';
import Phaser from 'phaser';
import type { Entity, GameWorld, Renderable } from '@/ecs/Entity';
import type { GameSystem, SystemConfig } from '@/ecs/GameSystem';

type RenderableEntity = With<Entity, 'position' | 'renderable'>;

export class RenderingSystem implements GameSystem {
  private renderables: Query<RenderableEntity>;
  private scene: Phaser.Scene;
  private spriteMap = new Map<Entity, Phaser.GameObjects.Container>();
  private glowMap = new Map<Entity, Phaser.GameObjects.Graphics>();
  private lastTime = 0;

  constructor(private world: GameWorld, config: Pick<SystemConfig, 'scene'>) {
    this.scene = config.scene;
    this.renderables = world.with('position', 'renderable') as any;

    this.renderables.onEntityAdded.subscribe((entity) => {
      try {
        this.createSprite(entity);
      } catch (error) {
        console.error('[RenderingSystem] Error creating sprite:', error);
      }
    });

    this.renderables.onEntityRemoved.subscribe((entity) => {
      try {
        this.destroySprite(entity);
      } catch (error) {
        console.error('[RenderingSystem] Error destroying sprite:', error);
      }
    });
  }

  destroy(): void {
    for (const [, sprite] of this.spriteMap) {
      sprite.destroy();
    }
    this.spriteMap.clear();
    this.glowMap.clear();
  }

  update(_delta: number, time: number): void {
    const deltaInSeconds = _delta / 1000;
    this.lastTime = time;

    for (const entity of this.renderables) {
      try {
        this.updateSprite(entity, deltaInSeconds);
      } catch (error) {
        console.error('[RenderingSystem] Error updating sprite:', error);
      }
    }
  }

  private createSprite(entity: RenderableEntity): void {
    const { position, renderable } = entity;

    const container = this.scene.add.container(position.x, position.y);

    if (renderable.glow) {
      const glowGraphics = this.createGlow(renderable);
      glowGraphics.setData('color', renderable.glow.color);
      glowGraphics.setData('radius', renderable.glow.radius);
      glowGraphics.setData('intensity', renderable.glow.intensity);
      container.add(glowGraphics);
      this.glowMap.set(entity, glowGraphics);
    }

    if (renderable.sprite && this.scene.textures.exists(renderable.sprite)) {
      const sprite = this.scene.add.sprite(0, 0, renderable.sprite);
      const scale = (renderable.radius * 2) / Math.max(sprite.width, sprite.height);
      sprite.setScale(scale);
      sprite.setPosition(0, renderable.offsetY || 0);
      container.add(sprite);
    } else {
      const circle = this.scene.add.circle(0, 0, renderable.radius, renderable.color);
      circle.setPosition(0, renderable.offsetY || 0);
      container.add(circle);
    }

    container.setScale(renderable.scale);
    container.setDepth(renderable.depth);
    this.applyTintToChildren(container, renderable.tint);

    this.spriteMap.set(entity, container);
  }

  private updateSprite(entity: RenderableEntity, deltaInSeconds: number): void {
    const sprite = this.spriteMap.get(entity);
    if (!sprite) return;

    const { position, renderable } = entity;

    sprite.setPosition(position.x, position.y);
    sprite.setScale(renderable.scale);

    if (renderable.rotationSpeed !== 0) {
      renderable.rotation += renderable.rotationSpeed * deltaInSeconds;
      renderable.rotation = renderable.rotation % (Math.PI * 2);
    }

    sprite.setRotation(renderable.rotation);

    const existingGlow = this.glowMap.get(entity);
    if (renderable.glow && existingGlow) {
      const needsUpdate =
        !existingGlow.getData('color') ||
        existingGlow.getData('color') !== renderable.glow.color ||
        existingGlow.getData('radius') !== renderable.glow.radius ||
        existingGlow.getData('intensity') !== renderable.glow.intensity;

      if (needsUpdate) {
        existingGlow.destroy();
        sprite.remove(existingGlow);

        const newGlow = this.createGlow(renderable);
        sprite.addAt(newGlow, 0);
        this.glowMap.set(entity, newGlow);

        newGlow.setData('color', renderable.glow.color);
        newGlow.setData('radius', renderable.glow.radius);
        newGlow.setData('intensity', renderable.glow.intensity);
      }
    }

    if (renderable.glow?.pulse?.enabled) {
      this.updateGlowPulse(entity, renderable, deltaInSeconds);
    }

    this.applyTintToChildren(sprite, renderable.tint);
  }

  private destroySprite(entity: Entity): void {
    const sprite = this.spriteMap.get(entity);
    if (sprite) {
      sprite.destroy();
      this.spriteMap.delete(entity);
    }
    this.glowMap.delete(entity);
  }

  private applyTintToChildren(container: Phaser.GameObjects.Container, tint: number): void {
    container.list.forEach((child: any) => {
      if (child.setTint) {
        child.setTint(tint);
      } else if (child.setFillStyle) {
        const r = ((tint >> 16) & 0xFF);
        const g = ((tint >> 8) & 0xFF);
        const b = (tint & 0xFF);
        const hexColor = (r << 16) | (g << 8) | b;
        child.setFillStyle(hexColor);
      }
    });
  }

  private createGlow(renderable: Renderable): Phaser.GameObjects.Graphics {
    const glowGraphics = this.scene.add.graphics();

    if (!renderable.glow) return glowGraphics;

    const { radius, color, intensity } = renderable.glow;

    const steps = 10;
    for (let i = steps; i >= 0; i--) {
      const stepRadius = radius * (i / steps);
      const stepAlpha = intensity * (1 - i / steps) * 0.3;
      glowGraphics.fillStyle(color, stepAlpha);
      glowGraphics.fillCircle(0, 0, stepRadius);
    }

    glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
    return glowGraphics;
  }

  private updateGlowPulse(entity: Entity, renderable: Renderable, _deltaInSeconds: number): void {
    const glow = this.glowMap.get(entity);
    if (!glow || !renderable.glow?.pulse) return;

    const pulse = renderable.glow.pulse;
    const time = this.lastTime;

    const cyclePosition = (time / 1000) * pulse.speed;
    const sineWave = Math.sin(cyclePosition * Math.PI * 2);
    const normalizedSine = (sineWave + 1) / 2;

    const currentIntensity = pulse.minIntensity + (normalizedSine * (pulse.maxIntensity - pulse.minIntensity));
    glow.setAlpha(currentIntensity);
  }

  getSpriteForEntity(entity: Entity): Phaser.GameObjects.Container | undefined {
    return this.spriteMap.get(entity);
  }
}
