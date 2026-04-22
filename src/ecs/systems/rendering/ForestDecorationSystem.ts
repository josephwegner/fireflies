import Phaser from 'phaser';
import type { GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { GAME_CONFIG } from '@/config';
import { logger } from '@/utils/logger';

const TREE_SPAWN_THRESHOLD = 0.3;

export class ForestDecorationSystem implements GameSystem {
  private scene: Phaser.Scene;
  private map: number[][];
  private decorations: Phaser.GameObjects.Image[] = [];
  private treesCreated = false;

  constructor(_world: GameWorld, config: Record<string, any>) {
    this.scene = config.scene;
    this.map = config.map;
  }

  update(_delta: number, _time: number): void {
    if (this.treesCreated) return;
    if (!this.scene || !this.map) return;

    if (this.scene.textures.exists('tree1')) {
      this.createForestDecorations();
      this.treesCreated = true;
    }
  }

  private createForestDecorations(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const treeKeys = ['tree1', 'tree2', 'tree3', 'tree4'];
    let treesPlaced = 0;

    for (let row = 0; row < this.map.length; row++) {
      for (let col = 0; col < this.map[row].length; col++) {
        if (this.map[row][col] === 0) {
          if (Math.random() > TREE_SPAWN_THRESHOLD) {
            const x = col * TILE + TILE / 2;
            const y = (row - 1) * TILE + TILE / 2;

            const treeKey = treeKeys[Math.floor(Math.random() * treeKeys.length)];

            if (this.scene.textures.exists(treeKey)) {
              const tree = this.scene.add.image(x, y, treeKey);
              tree.setOrigin(0.5, 0.5);

              const scale = (TILE * 1.2) / Math.max(tree.width, tree.height);
              tree.setScale(scale);

              tree.x += (Math.random() - 0.5) * TILE * 0.2;
              tree.y += (Math.random() - 0.5) * TILE * 0.2;

              tree.setAlpha(0.6 + Math.random() * 0.2);
              tree.setDepth(-1);

              this.decorations.push(tree);
              treesPlaced++;
            }
          }
        }
      }
    }

    logger.debug('ForestDecorationSystem', `Placed ${treesPlaced} trees`);
  }

  destroy(): void {
    this.decorations.forEach(decoration => decoration.destroy());
    this.decorations = [];
    this.treesCreated = false;
  }
}
