import { System } from 'ecsy';
import Phaser from 'phaser';
import { Position, Velocity, Trail } from '@/ecs/components';
import { ECSEntity } from '@/types';

export class TrailSystem extends System {
  private scene!: Phaser.Scene;
  private trailGraphics!: Phaser.GameObjects.Graphics;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
  }

  init(attributes?: any): void {
    if (attributes?.scene) {
      this.scene = attributes.scene;
      this.trailGraphics = this.scene.add.graphics();
      // Trails render behind everything except trees
      this.trailGraphics.setDepth(-0.5);
      // Use ADD blend mode for luminous effect
      this.trailGraphics.setBlendMode(Phaser.BlendModes.ADD);
      console.log('[TrailSystem] Initialized');
    }
  }

  static queries = {
    trailedEntities: {
      components: [Position, Velocity, Trail]
    }
  };

  execute(delta: number, time: number): void {
    const { trailedEntities } = this.queries;

    // Clear previous trails
    this.trailGraphics.clear();

    trailedEntities.results.forEach((entity) => {
      const trail = entity.getMutableComponent(Trail)!;
      
      if (!trail.enabled || !trail.config) return;

      const position = entity.getComponent(Position)!;
      const velocity = entity.getComponent(Velocity)!;

      // Check if entity is moving
      const isMoving = Math.abs(velocity.vx) > 0.1 || Math.abs(velocity.vy) > 0.1;

      if (isMoving) {
        // Add current position to trail
        trail.points.push({
          x: position.x,
          y: position.y,
          timestamp: time
        });

        // Limit trail length
        if (trail.points.length > trail.config.length) {
          trail.points.shift();
        }
      }

      // Remove old trail points
      trail.points = trail.points.filter(point => {
        const age = time - point.timestamp;
        return age < trail.config.fadeTime;
      });

      // Render trail
      if (trail.points.length > 1) {
        this.renderTrail(trail, time);
      }
    });
  }

  private renderTrail(trail: Trail, currentTime: number): void {
    const { points, config } = trail;

    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i];
      const nextPoint = points[i + 1];
      
      // Calculate alpha based on age
      const age = currentTime - point.timestamp;
      const normalizedAge = Math.min(age / config.fadeTime, 1);
      const alpha = Math.max((1 - normalizedAge) * 0.6, config.minAlpha);

      // Draw trail segment
      this.trailGraphics.lineStyle(config.width, config.color, alpha);
      this.trailGraphics.lineBetween(point.x, point.y, nextPoint.x, nextPoint.y);
    }
  }
}

