import type { Query, With } from 'miniplex';
import Phaser from 'phaser';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';

export class WallRenderingSystem implements GameSystem {
  private walls: Query<With<Entity, 'wall'>>;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private wallsDrawn = false;

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.scene = config.scene;
    this.graphics = this.scene.add.graphics();
    this.walls = world.with('wall') as any;
  }

  update(_delta: number, _time: number): void {
    if (this.wallsDrawn) return;

    for (const entity of this.walls) {
      const { wall } = entity;

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
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
