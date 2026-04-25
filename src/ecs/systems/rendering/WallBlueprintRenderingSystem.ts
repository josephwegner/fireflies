import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem, SystemConfig } from '@/ecs/GameSystem';
import { GAME_CONFIG } from '@/config';

type BlueprintEntity = With<Entity, 'wallBlueprint' | 'wallBlueprintTag' | 'buildable'>;

const BLUEPRINT_COLOR = 0x88AACC;
const NODE_RADIUS = 5;
const GLOW_COLOR = 0x5ED6FE;
const GLOW_STEPS = 6;
const GLOW_RADIUS = 12;
const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_OFFSET_Y = -12;

export class WallBlueprintRenderingSystem implements GameSystem {
  private blueprints: Query<BlueprintEntity>;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(private world: GameWorld, config: Pick<SystemConfig, 'scene'>) {
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
        if (entity.health && entity.health.currentHealth < entity.health.maxHealth) {
          this.drawHealthBar(s0, s1, entity.health.currentHealth / entity.health.maxHealth);
        }
      } else {
        this.drawBlueprintLine(s0, s1);
        this.drawBuildProgress(s0);
        this.drawBuildProgress(s1);
      }
    }
  }

  private drawActiveLine(s0: { x: number; y: number }, s1: { x: number; y: number }): void {
    // Thin solid line matching blueprint thickness
    this.graphics.lineStyle(2, BLUEPRINT_COLOR, 0.5);
    this.graphics.lineBetween(s0.x, s0.y, s1.x, s1.y);

    // Glowing endpoint circles
    this.drawGlowingEndpoint(s0.x, s0.y);
    this.drawGlowingEndpoint(s1.x, s1.y);
  }

  private drawGlowingEndpoint(x: number, y: number): void {
    // Cyan glow (additive-style concentric circles)
    for (let i = GLOW_STEPS; i >= 0; i--) {
      const t = i / GLOW_STEPS;
      const r = NODE_RADIUS + (GLOW_RADIUS - NODE_RADIUS) * t;
      const alpha = 0.15 * (1 - t);
      this.graphics.fillStyle(GLOW_COLOR, alpha);
      this.graphics.fillCircle(x, y, r);
    }

    // White filled circle
    this.graphics.fillStyle(0xFFFFFF, 0.9);
    this.graphics.fillCircle(x, y, NODE_RADIUS);
  }

  private drawBlueprintLine(s0: { x: number; y: number }, s1: { x: number; y: number }): void {
    const dx = s1.x - s0.x;
    const dy = s1.y - s0.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;

    this.graphics.lineStyle(2, BLUEPRINT_COLOR, 0.5);

    let traveled = 0;
    while (traveled < len) {
      const segEnd = Math.min(traveled + GAME_CONFIG.WALL_DASH_LENGTH, len);
      this.graphics.lineBetween(
        s0.x + nx * traveled, s0.y + ny * traveled,
        s0.x + nx * segEnd, s0.y + ny * segEnd
      );
      traveled = segEnd + GAME_CONFIG.WALL_GAP_LENGTH;
    }
  }

  private drawBuildProgress(site: { x: number; y: number; built: boolean; buildProgress: number }): void {
    // Background ring
    this.graphics.lineStyle(2, BLUEPRINT_COLOR, 0.3);
    this.graphics.strokeCircle(site.x, site.y, NODE_RADIUS);

    // Progress fill (shows full circle when built)
    const progress = site.built ? 1 : site.buildProgress;
    if (progress > 0) {
      this.graphics.fillStyle(BLUEPRINT_COLOR, 0.6);
      this.graphics.slice(
        site.x, site.y, NODE_RADIUS,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(progress, 1),
        false
      );
      this.graphics.fillPath();
    }
  }

  private drawHealthBar(s0: { x: number; y: number }, s1: { x: number; y: number }, fraction: number): void {
    const cx = (s0.x + s1.x) / 2;
    const cy = (s0.y + s1.y) / 2 + HEALTH_BAR_OFFSET_Y;
    const left = cx - HEALTH_BAR_WIDTH / 2;

    // Background
    this.graphics.fillStyle(0x333333, 0.8);
    this.graphics.fillRect(left, cy, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

    // Fill
    const fillColor = fraction > 0.5 ? 0x44AA44 : fraction > 0.25 ? 0xAAAA44 : 0xAA4444;
    this.graphics.fillStyle(fillColor, 0.9);
    this.graphics.fillRect(left, cy, HEALTH_BAR_WIDTH * Math.max(0, fraction), HEALTH_BAR_HEIGHT);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
