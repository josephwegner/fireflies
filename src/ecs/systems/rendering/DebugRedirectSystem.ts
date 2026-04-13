import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';

type RedirectEntity = With<Entity, 'position' | 'redirect' | 'redirectTag'>;

export class DebugRedirectSystem implements GameSystem {
  private redirects: Query<RedirectEntity>;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.scene = config.scene;
    this.redirects = world.with('position', 'redirect', 'redirectTag') as any;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(999);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  update(_delta: number, _time: number): void {
    this.graphics.clear();

    for (const entity of this.redirects) {
      const { position, redirect } = entity;

      // Draw radius circle
      this.graphics.lineStyle(1, 0xffff00, 0.3);
      this.graphics.strokeCircle(position.x, position.y, redirect.radius);

      // Draw center dot
      this.graphics.fillStyle(0xffff00, 0.8);
      this.graphics.fillCircle(position.x, position.y, 4);

      // Draw lines to each exit, thickness proportional to weight
      const totalWeight = redirect.exits.reduce((s, e) => s + e.weight, 0);
      for (const exit of redirect.exits) {
        const fraction = exit.weight / totalWeight;
        this.graphics.lineStyle(1 + fraction * 3, 0x00ffff, 0.6);
        this.graphics.lineBetween(position.x, position.y, exit.x, exit.y);

        // Exit marker
        this.graphics.fillStyle(0x00ffff, 0.8);
        this.graphics.fillCircle(exit.x, exit.y, 3);
      }

      // Label with types
      const label = redirect.for.join(', ');
      const text = this.scene.add.text(position.x + 6, position.y - 10, label, {
        fontSize: '10px',
        color: '#ffff00',
      });
      text.setDepth(999);
      // Store for cleanup next frame
      this.graphics.setData('texts', [...(this.graphics.getData('texts') || []), text]);
    }

    // Cleanup previous frame's texts
    const oldTexts: Phaser.GameObjects.Text[] = this.graphics.getData('prevTexts') || [];
    for (const t of oldTexts) t.destroy();
    this.graphics.setData('prevTexts', this.graphics.getData('texts') || []);
    this.graphics.setData('texts', []);
  }
}
