import { System } from 'ecsy';
import Phaser from 'phaser';
import { Position, Renderable } from '@/ecs/components';
import { ECSEntity } from '@/types';

export class RenderingSystem extends System {
  private scene!: Phaser.Scene;
  private spriteMap: Map<ECSEntity, Phaser.GameObjects.Container>;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
    this.spriteMap = new Map();
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

    // Apply initial scale and tint
    container.setScale(renderable.scale);
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

  getSpriteForEntity(entity: ECSEntity): Phaser.GameObjects.Container | undefined {
    return this.spriteMap.get(entity);
  }
}
