import type { Query, With } from 'miniplex';
import Phaser from 'phaser';
import type { Entity, GameWorld, Trail } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';

type TrailedEntity = With<Entity, 'position' | 'velocity' | 'trail'>;

export class TrailSystem implements GameSystem {
  private trailedEntities: Query<TrailedEntity>;
  private scene: Phaser.Scene;
  private trailGraphics: Phaser.GameObjects.Graphics;

  constructor(_world: GameWorld, config: Record<string, any>) {
    this.scene = config.scene;
    this.trailGraphics = this.scene.add.graphics();
    this.trailGraphics.setDepth(-0.5);
    this.trailGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.trailedEntities = _world.with('position', 'velocity', 'trail') as any;
  }

  update(_delta: number, time: number): void {
    this.trailGraphics.clear();

    for (const entity of this.trailedEntities) {
      const { trail, position, velocity } = entity;

      if (!trail.enabled || !trail.config) continue;

      const isMoving = Math.abs(velocity.vx) > 0.1 || Math.abs(velocity.vy) > 0.1;

      if (isMoving) {
        trail.points.push({ x: position.x, y: position.y, timestamp: time });

        if (trail.points.length > trail.config.length) {
          trail.points.shift();
        }
      }

      trail.points = trail.points.filter(point => {
        const age = time - point.timestamp;
        return age < trail.config.fadeTime;
      });

      if (trail.points.length > 1) {
        this.renderTrail(trail, time);
      }
    }
  }

  private renderTrail(trail: Trail, currentTime: number): void {
    const { points, config } = trail;

    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i];
      const nextPoint = points[i + 1];

      const age = currentTime - point.timestamp;
      const normalizedAge = Math.min(age / config.fadeTime, 1);
      const alpha = Math.max((1 - normalizedAge) * 0.6, config.minAlpha);

      this.trailGraphics.lineStyle(config.width, config.color, alpha);
      this.trailGraphics.lineBetween(point.x, point.y, nextPoint.x, nextPoint.y);
    }
  }

  destroy(): void {
    this.trailGraphics.destroy();
  }
}
