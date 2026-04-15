import Phaser from 'phaser';
import { WorldManager } from '@/ecs/WorldManager';
import { AssetLoader } from '@/assets';
import { GAME_CONFIG } from '@/config';
import { EnergyManager } from '@/ui/EnergyManager';
import { parseTmx } from '@/levels/parseTmx';
import { loadLevelFromData } from '@/levels/loadLevel';
import { LEVELS, LEVELS_BY_NAME } from '@/levels/levelRegistry';
import { gameEvents, GameEvents } from '@/events';

export class GameScene extends Phaser.Scene {
  private worldManager!: WorldManager;
  private pathfindingWorker!: Worker;
  private levelIndex = 0;
  private levelOverride: string | null = null;

  constructor() {
    super('GameScene');
  }

  init(data?: { levelIndex?: number }): void {
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get('level');
    this.levelOverride = null;
    if (data?.levelIndex !== undefined) {
      this.levelIndex = data.levelIndex;
    } else if (levelParam && levelParam in LEVELS_BY_NAME) {
      this.levelOverride = levelParam;
    } else if (levelParam) {
      this.levelIndex = Math.max(0, Math.min(parseInt(levelParam) - 1, LEVELS.length - 1));
    } else {
      this.levelIndex = 0;
    }
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

    const tmx = this.levelOverride ? LEVELS_BY_NAME[this.levelOverride] : LEVELS[this.levelIndex];
    const levelData = parseTmx(tmx);
    const levelConfig = {
      initialEnergy: levelData.config.initialEnergy,
      firefliesToWin: levelData.config.firefliesToWin,
      store: GAME_CONFIG.STORE
    };
    const energyManager = new EnergyManager(levelConfig.initialEnergy);

    const debug = new URLSearchParams(window.location.search).has('debug');

    this.pathfindingWorker = this.createWorker();
    this.worldManager = new WorldManager(this, this.pathfindingWorker, levelData.map, {
      energyManager,
      levelConfig,
      levelIndex: this.levelIndex,
      onNextLevel: () => {
        this.worldManager.destroy();
        gameEvents.clear();
        this.scene.restart({ levelIndex: this.levelIndex + 1 });
      },
      onRetry: () => {
        this.worldManager.destroy();
        gameEvents.clear();
        this.scene.restart({ levelIndex: this.levelIndex });
      },
      debug
    });

    loadLevelFromData(this.worldManager.world, levelData);

    gameEvents.once(GameEvents.GAME_STARTED, () => {
      this.worldManager.setPaused(false);
    });

    gameEvents.once(GameEvents.LEVEL_WON, () => {
      this.worldManager.setPaused(true);
    });

    gameEvents.once(GameEvents.LEVEL_LOST, () => {
      this.worldManager.setPaused(true);
    });
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
