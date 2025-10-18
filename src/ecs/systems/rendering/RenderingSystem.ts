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

  execute() {
    const { renderables } = this.queries;

    renderables.added?.forEach((entity) => {
      this.createSprite(entity);
    });

    renderables.removed?.forEach((entity) => {
      this.destroySprite(entity);
    });

    renderables.results.forEach((entity) => {
      this.updateSprite(entity);
    });
  }

  private createSprite(entity: ECSEntity): void {
    const position = entity.getComponent(Position)!;
    const renderable = entity.getComponent(Renderable)!;

    const container = this.scene.add.container(position.x, position.y);

    const sprite = this.scene.add.circle(0, 0, renderable.radius, renderable.color);
    container.add(sprite);

    this.spriteMap.set(entity, container);
  }

  private updateSprite(entity: ECSEntity): void {
    const sprite = this.spriteMap.get(entity);
    if (!sprite) return;

    const position = entity.getComponent(Position)!;
    sprite.setPosition(position.x, position.y);
  }

  private destroySprite(entity: ECSEntity): void {
    const sprite = this.spriteMap.get(entity);
    if (sprite) {
      sprite.destroy();
      this.spriteMap.delete(entity);
    }
  }

  getSpriteForEntity(entity: ECSEntity): Phaser.GameObjects.Container | undefined {
    return this.spriteMap.get(entity);
  }
}
