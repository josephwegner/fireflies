import { System } from 'ecsy';
import Phaser from 'phaser';
import { Position, Renderable } from '@/ecs/components';
import { ECSEntity } from '@/types';

export class RenderingSystem extends System {
  private scene!: Phaser.Scene;
  private spriteMap: Map<ECSEntity, Phaser.GameObjects.Container>;
  private glowMap: Map<ECSEntity, Phaser.GameObjects.Graphics>;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
    this.spriteMap = new Map();
    this.glowMap = new Map();
  }

  init(attributes?: any): void {
    if (attributes?.scene) {
      this.scene = attributes.scene;
    }
  }

  static queries = {
    renderables: {
      components: [Position, Renderable],
      listen: {
        added: true,
        removed: true
      }
    }
  };

  execute(delta: number, time: number) {
    const { renderables } = this.queries;
    const deltaInSeconds = delta / 1000;
    this.lastTime = time;

    renderables.added?.forEach((entity) => {
      try {
        this.createSprite(entity);
      } catch (error) {
        console.error('[RenderingSystem] Error creating sprite for entity:', entity.id, error);
      }
    });

    renderables.removed?.forEach((entity) => {
      try {
        this.destroySprite(entity);
      } catch (error) {
        console.error('[RenderingSystem] Error destroying sprite for entity:', entity.id, error);
      }
    });

    renderables.results.forEach((entity) => {
      try {
        this.updateSprite(entity, deltaInSeconds);
      } catch (error) {
        console.error('[RenderingSystem] Error updating sprite for entity:', entity.id, error);
      }
    });
  }

  private createSprite(entity: ECSEntity): void {
    const position = entity.getComponent(Position)!;
    const renderable = entity.getComponent(Renderable)!;

    const container = this.scene.add.container(position.x, position.y);

    // Create glow effect if configured (check for both null and undefined)
    if (renderable.glow && renderable.glow !== null) {
      const glowGraphics = this.createGlow(renderable);
      container.add(glowGraphics);
      this.glowMap.set(entity, glowGraphics);
    }

    // Use sprite if available, otherwise fall back to circle
    if (renderable.sprite && this.scene.textures.exists(renderable.sprite)) {
      const sprite = this.scene.add.sprite(0, 0, renderable.sprite);

      // Scale sprite to match the desired radius
      const scale = (renderable.radius * 2) / Math.max(sprite.width, sprite.height);
      sprite.setScale(scale);

      container.add(sprite);
    } else {
      // Fallback to circle if no sprite or sprite not loaded
      const circle = this.scene.add.circle(0, 0, renderable.radius, renderable.color);
      container.add(circle);
    }

    // Apply initial scale, tint, and depth
    container.setScale(renderable.scale);
    container.setDepth(renderable.depth);
    this.applyTintToChildren(container, renderable.tint);

    this.spriteMap.set(entity, container);
  }

  private updateSprite(entity: ECSEntity, deltaInSeconds: number): void {
    const sprite = this.spriteMap.get(entity);
    if (!sprite) return;

    const position = entity.getComponent(Position)!;
    const renderable = entity.getMutableComponent(Renderable)!;
    
    sprite.setPosition(position.x, position.y);
    sprite.setScale(renderable.scale);

    // Update rotation if there's a rotation speed
    if (renderable.rotationSpeed !== 0) {
      renderable.rotation += renderable.rotationSpeed * deltaInSeconds;
      // Keep rotation in 0-2π range to avoid floating point drift
      renderable.rotation = renderable.rotation % (Math.PI * 2);
    }
    
    sprite.setRotation(renderable.rotation);

    // Update glow pulsing animation if enabled
    if (renderable.glow?.pulse?.enabled) {
      this.updateGlowPulse(entity, renderable, deltaInSeconds);
    }

    // Get tint of the first child sprite or circle, if present
    let childTint = undefined;
    const mainChild = (sprite.list && sprite.list.length > 0) ? sprite.list[0] : undefined;
    if (mainChild && typeof mainChild.tintTopLeft !== 'undefined') {
      // Phaser v3 Sprite, use tintTopLeft (or tint for v2/older plugins)
      childTint = mainChild.tintTopLeft;
    } else if (mainChild && mainChild.fillColor) {
      childTint = mainChild.fillColor;
    }

    // check if sprite is currently green and turning white
    if (renderable.tint === 16777215 && childTint === 65280) {
      debugger;
      console.log('Sprite is currently green and turning white');
    }

    this.applyTintToChildren(sprite, renderable.tint);
  }

  private destroySprite(entity: ECSEntity): void {
    const sprite = this.spriteMap.get(entity);
    if (sprite) {
      sprite.destroy();
      this.spriteMap.delete(entity);
    }
    
    // Clean up glow graphics if present
    const glow = this.glowMap.get(entity);
    if (glow) {
      this.glowMap.delete(entity);
    }
  }

  private applyTintToChildren(container: Phaser.GameObjects.Container, tint: number): void {
    // Apply tint to all children in the container
    container.list.forEach((child: any) => {
      if (child.setTint) {
        child.setTint(tint);
      } else if (child.setFillStyle) {
        // For circles, we need to update fillStyle
        // Convert hex tint to RGB components
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
    
    if (!renderable.glow || renderable.glow === null) {
      return glowGraphics;
    }

    const { radius, color, intensity } = renderable.glow;
    
    // Create radial gradient effect with multiple circles
    // Draw from outside to inside with decreasing alpha for smooth fade
    const steps = 10;
    for (let i = steps; i >= 0; i--) {
      const stepRadius = radius * (i / steps);
      const stepAlpha = intensity * (1 - i / steps) * 0.3; // Fade out towards edges
      
      glowGraphics.fillStyle(color, stepAlpha);
      glowGraphics.fillCircle(0, 0, stepRadius);
    }
    
    // Use ADD blend mode for luminous effect
    glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
    
    return glowGraphics;
  }

  private updateGlowPulse(entity: ECSEntity, renderable: Renderable, deltaInSeconds: number): void {
    const glow = this.glowMap.get(entity);
    if (!glow || !renderable.glow || renderable.glow === null || !renderable.glow.pulse) return;

    const pulse = renderable.glow.pulse;
    const time = this.world.getSystem(RenderingSystem).lastTime || 0;
    
    // Calculate pulsing intensity using sine wave
    const cyclePosition = (time / 1000) * pulse.speed;
    const sineWave = Math.sin(cyclePosition * Math.PI * 2);
    const normalizedSine = (sineWave + 1) / 2; // Convert from [-1,1] to [0,1]
    
    // Map to min/max intensity range
    const currentIntensity = pulse.minIntensity + (normalizedSine * (pulse.maxIntensity - pulse.minIntensity));
    
    // Update the glow's alpha to reflect new intensity
    glow.setAlpha(currentIntensity);
  }

  getSpriteForEntity(entity: ECSEntity): Phaser.GameObjects.Container | undefined {
    return this.spriteMap.get(entity);
  }
  
  // Track last time for pulse calculations
  private lastTime: number = 0;
}
