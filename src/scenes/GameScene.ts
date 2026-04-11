import Phaser from 'phaser';
import { WorldManager } from '@/ecs/WorldManager';
import { AssetLoader } from '@/assets';
import { GAME_CONFIG } from '@/config';
import { LEVEL_1_MAP, loadLevel } from '@/levels/level1';

export class GameScene extends Phaser.Scene {
  private worldManager!: WorldManager;
  private pathfindingWorker!: Worker;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    AssetLoader.preloadAll(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0A1824);

    const mapCenterX = (GAME_CONFIG.MAP_WIDTH * GAME_CONFIG.TILE_SIZE) / 2;
    const mapCenterY = (GAME_CONFIG.MAP_HEIGHT * GAME_CONFIG.TILE_SIZE) / 2;
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(mapCenterX, mapCenterY);

    this.scale.on('resize', () => {
      this.cameras.main.centerOn(mapCenterX, mapCenterY);
    });

    this.pathfindingWorker = this.createWorker();
    this.worldManager = new WorldManager(this, this.pathfindingWorker, LEVEL_1_MAP);

    loadLevel(this.worldManager.world);
  }

  protected createWorker(): Worker {
    return new Worker(
      new URL('../workers/pathfinding/worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  update(time: number, delta: number): void {
    this.worldManager.update(delta, time);
  }
}
