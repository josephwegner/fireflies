import Phaser from 'phaser';
import { WorldManager } from '@/ecs/WorldManager';
import { AssetLoader } from '@/assets';
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
