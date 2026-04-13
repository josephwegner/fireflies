import Phaser from 'phaser';
import { WorldManager } from '@/ecs/WorldManager';
import { AssetLoader } from '@/assets';
import { GAME_CONFIG } from '@/config';
import { EnergyManager } from '@/ui/EnergyManager';
import { LEVEL_1_MAP, LEVEL_1_CONFIG, loadLevel } from '@/levels/level1';

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

    const { STORE_DRAWER_WIDTH, STATUS_BAR_HEIGHT } = GAME_CONFIG;
    const mapCenterX = (GAME_CONFIG.MAP_WIDTH * GAME_CONFIG.TILE_SIZE) / 2;
    const mapCenterY = (GAME_CONFIG.MAP_HEIGHT * GAME_CONFIG.TILE_SIZE) / 2;

    this.setupViewport(STORE_DRAWER_WIDTH, STATUS_BAR_HEIGHT, mapCenterX, mapCenterY);

    this.scale.on('resize', () => {
      this.setupViewport(STORE_DRAWER_WIDTH, STATUS_BAR_HEIGHT, mapCenterX, mapCenterY);
    });

    const energyManager = new EnergyManager(LEVEL_1_CONFIG.initialEnergy);

    const debug = new URLSearchParams(window.location.search).has('debug');

    this.pathfindingWorker = this.createWorker();
    this.worldManager = new WorldManager(this, this.pathfindingWorker, LEVEL_1_MAP, {
      energyManager,
      levelConfig: LEVEL_1_CONFIG,
      debug
    });

    loadLevel(this.worldManager.world);
  }

  private setupViewport(
    drawerWidth: number,
    barHeight: number,
    mapCenterX: number,
    mapCenterY: number
  ): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setViewport(drawerWidth, barHeight, w - drawerWidth, h - barHeight);
    this.cameras.main.centerOn(mapCenterX, mapCenterY);
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
