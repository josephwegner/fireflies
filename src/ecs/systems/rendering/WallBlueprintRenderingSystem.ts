import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { GAME_CONFIG } from '@/config';

type BlueprintEntity = With<Entity, 'wallBlueprint' | 'wallBlueprintTag' | 'buildable'>;

const BLUEPRINT_COLOR = 0x88AACC;
const ACTIVE_COLOR = 0x446688;
const NODE_RADIUS = 5;

export class WallBlueprintRenderingSystem implements GameSystem {
  private blueprints: Query<BlueprintEntity>;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.scene = config.scene;
    this.blueprints = world.with('wallBlueprint', 'wallBlueprintTag', 'buildable') as any;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(35);
  }

  update(_delta: number, _time: number): void {
    this.graphics.clear();

    for (const entity of this.blueprints) {
      const { wallBlueprint, buildable } = entity;
      const sites = buildable.sites;
      if (sites.length < 2) continue;

      const s0 = sites[0];
      const s1 = sites[1];

      if (wallBlueprint.active) {
        this.drawActiveLine(s0, s1);
      } else {
        this.drawBlueprintLine(s0, s1);
        this.drawBuildProgress(s0);
        this.drawBuildProgress(s1);
      }
    }
  }

  private drawActiveLine(s0: { x: number; y: number }, s1: { x: number; y: number }): void {
    this.graphics.lineStyle(GAME_CONFIG.WALL_BLUEPRINT_THICKNESS, ACTIVE_COLOR, 1);
    this.graphics.lineBetween(s0.x, s0.y, s1.x, s1.y);
  }

  private drawBlueprintLine(s0: { x: number; y: number }, s1: { x: number; y: number }): void {
    const dx = s1.x - s0.x;
    const dy = s1.y - s0.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const dashLen = 8;
    const gapLen = 6;
    const nx = dx / len;
    const ny = dy / len;

    this.graphics.lineStyle(2, BLUEPRINT_COLOR, 0.5);

    let traveled = 0;
    while (traveled < len) {
      const segEnd = Math.min(traveled + dashLen, len);
      this.graphics.lineBetween(
        s0.x + nx * traveled, s0.y + ny * traveled,
        s0.x + nx * segEnd, s0.y + ny * segEnd
      );
      traveled = segEnd + gapLen;
    }
  }

  private drawBuildProgress(site: { x: number; y: number; built: boolean; buildProgress: number }): void {
    if (site.built) {
      this.graphics.fillStyle(0x00ff00, 0.8);
      this.graphics.fillCircle(site.x, site.y, NODE_RADIUS);
    } else {
      // Background ring
      this.graphics.lineStyle(2, BLUEPRINT_COLOR, 0.3);
      this.graphics.strokeCircle(site.x, site.y, NODE_RADIUS);

      // Progress fill
      if (site.buildProgress > 0) {
        this.graphics.fillStyle(BLUEPRINT_COLOR, 0.6);
        // Draw arc proportional to progress
        this.graphics.slice(
          site.x, site.y, NODE_RADIUS,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * Math.min(site.buildProgress, 1),
          false
        );
        this.graphics.fillPath();
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
