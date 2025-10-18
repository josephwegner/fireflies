import { System } from 'ecsy';
import Phaser from 'phaser';
import { Wall } from '@/ecs/components';

export class WallRenderingSystem extends System {
  private scene!: Phaser.Scene;
  private graphics!: Phaser.GameObjects.Graphics;
  private wallsDrawn: boolean = false;

  init(attributes?: any): void {
    if (attributes?.scene) {
      this.scene = attributes.scene;
      this.graphics = this.scene.add.graphics();
    }
  }

  execute(): void {
    if (this.wallsDrawn) return;

    this.queries.walls.results.forEach(entity => {
      const wall = entity.getComponent(Wall)!;

      this.graphics.lineStyle(wall.thickness, wall.color);

      wall.segments.forEach(segment => {
        if (segment.length >= 2) {
          this.graphics.beginPath();
          this.graphics.moveTo(segment[0].x, segment[0].y);

          for (let i = 1; i < segment.length; i++) {
            this.graphics.lineTo(segment[i].x, segment[i].y);
          }

          this.graphics.strokePath();
        }
      });

      this.wallsDrawn = true;
    });
  }

  static queries = {
    walls: {
      components: [Wall]
    }
  };
}
