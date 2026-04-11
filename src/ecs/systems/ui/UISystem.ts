import type { GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import type { EnergyManager } from '@/ui/EnergyManager';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';

interface StoreConfig {
  [itemType: string]: { cost: number };
}

interface LevelConfig {
  store: StoreConfig;
}

export class UISystem implements GameSystem {
  private scene: Phaser.Scene;
  private energyManager: EnergyManager;
  private levelConfig: LevelConfig;

  private background!: Phaser.GameObjects.Graphics;
  private energyText!: Phaser.GameObjects.Text;
  private wispIcon!: Phaser.GameObjects.Sprite;
  private wispCostText!: Phaser.GameObjects.Text;

  private wispCost: number;

  constructor(_world: GameWorld, config: Record<string, any>) {
    this.scene = config.scene;
    this.energyManager = config.energyManager;
    this.levelConfig = config.levelConfig;
    this.wispCost = this.levelConfig.store.wisp.cost;

    this.createHUD();
  }

  private createHUD(): void {
    const { STORE_DRAWER_WIDTH, STATUS_BAR_HEIGHT } = GAME_CONFIG;

    this.background = this.scene.add.graphics();
    this.background.setScrollFactor(0);
    this.background.setDepth(1000);
    this.drawBackgrounds();

    this.energyText = this.scene.add.text(
      STORE_DRAWER_WIDTH + 12, 8,
      `Energy: ${this.energyManager.getEnergy()}`,
      { fontSize: '16px', color: '#E8F4F8', fontFamily: 'monospace' }
    );
    this.energyText.setScrollFactor(0);
    this.energyText.setDepth(1001);

    const iconX = STORE_DRAWER_WIDTH / 2;
    const iconY = STATUS_BAR_HEIGHT + 40;
    this.wispIcon = this.scene.add.sprite(iconX, iconY, 'wisp');
    this.wispIcon.setScrollFactor(0);
    this.wispIcon.setDepth(1001);
    this.wispIcon.setScale(1.5);
    this.wispIcon.setInteractive({ useHandCursor: true });
    this.wispIcon.on('pointerdown', () => {
      gameEvents.emit(GameEvents.PLACEMENT_STARTED, {
        itemType: 'wisp',
        cost: this.wispCost
      });
    });

    this.wispCostText = this.scene.add.text(
      iconX, iconY + 24,
      `${this.wispCost}`,
      { fontSize: '12px', color: '#B0C4DE', fontFamily: 'monospace' }
    );
    this.wispCostText.setScrollFactor(0);
    this.wispCostText.setDepth(1001);
    this.wispCostText.setOrigin(0.5, 0);

    this.scene.scale.on('resize', () => this.drawBackgrounds());
  }

  private drawBackgrounds(): void {
    const { STORE_DRAWER_WIDTH, STATUS_BAR_HEIGHT } = GAME_CONFIG;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    this.background.clear();

    this.background.fillStyle(0x0A1824, 0.9);
    this.background.fillRect(0, 0, w, STATUS_BAR_HEIGHT);

    this.background.fillStyle(0x0A1824, 0.9);
    this.background.fillRect(0, STATUS_BAR_HEIGHT, STORE_DRAWER_WIDTH, h - STATUS_BAR_HEIGHT);

    this.background.lineStyle(1, 0x1A3040);
    this.background.lineBetween(STORE_DRAWER_WIDTH, 0, STORE_DRAWER_WIDTH, h);
    this.background.lineBetween(0, STATUS_BAR_HEIGHT, w, STATUS_BAR_HEIGHT);
  }

  update(_delta: number, _time: number): void {
    this.energyText.setText(`Energy: ${this.energyManager.getEnergy()}`);

    if (this.energyManager.canAfford(this.wispCost)) {
      this.wispIcon.clearTint();
      this.wispIcon.setAlpha(1);
      this.wispIcon.setInteractive({ useHandCursor: true });
    } else {
      this.wispIcon.setTint(0x444444);
      this.wispIcon.setAlpha(0.5);
      this.wispIcon.disableInteractive();
    }
  }

  destroy(): void {
    this.energyText.destroy();
    this.background.destroy();
    this.wispIcon.destroy();
    this.wispCostText.destroy();
  }
}
