import type { GameWorld } from '@/ecs/Entity';
import { GameSystemBase } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { GAME_CONFIG } from '@/config';
import { LEVELS } from '@/levels/levelRegistry';

type OverlayState = 'pregame' | 'victory' | 'defeat' | 'none';

export class OverlaySystem extends GameSystemBase {
  private scene: Phaser.Scene;
  private levelIndex: number;
  private onNextLevel: () => void;
  private onRetry: () => void;

  private state: OverlayState = 'pregame';

  private startButton!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;

  private backdrop!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private actionButton!: Phaser.GameObjects.Text;

  constructor(_world: GameWorld, config: Record<string, any>) {
    super();
    this.scene = config.scene;
    this.levelIndex = config.levelIndex;
    this.onNextLevel = config.onNextLevel;
    this.onRetry = config.onRetry;

    this.listen(GameEvents.LEVEL_WON, this.handleLevelWon);
    this.listen(GameEvents.LEVEL_LOST, this.handleLevelLost);

    this.createStartButton();
    this.createOverlayElements();
  }

  destroy(): void {
    super.destroy();
    this.startButton.destroy();
    this.levelLabel.destroy();
    this.backdrop.destroy();
    this.titleText.destroy();
    this.subtitleText.destroy();
    this.actionButton.destroy();
  }

  update(_delta: number, _time: number): void {}

  private createStartButton(): void {
    const { STORE_DRAWER_WIDTH } = GAME_CONFIG;
    const cx = STORE_DRAWER_WIDTH / 2;

    this.levelLabel = this.scene.add.text(cx, this.scene.scale.height - 60, `Level ${this.levelIndex + 1}`, {
      fontSize: '11px', color: '#607888', fontFamily: 'monospace'
    });
    this.levelLabel.setOrigin(0.5);
    this.levelLabel.setScrollFactor(0);
    this.levelLabel.setDepth(1001);

    this.startButton = this.scene.add.text(cx, this.scene.scale.height - 38, 'Start', {
      fontSize: '14px', color: '#0A1824', fontFamily: 'monospace',
      backgroundColor: '#4CAF50', padding: { x: 10, y: 5 }
    });
    this.startButton.setOrigin(0.5);
    this.startButton.setScrollFactor(0);
    this.startButton.setDepth(1001);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.on('pointerdown', () => {
      this.startButton.setVisible(false);
      this.levelLabel.setVisible(false);
      this.state = 'none';
      gameEvents.emit(GameEvents.GAME_STARTED, {});
    });
  }

  private createOverlayElements(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    this.backdrop = this.scene.add.graphics();
    this.backdrop.setScrollFactor(0);
    this.backdrop.setDepth(2000);
    this.backdrop.setVisible(false);

    this.titleText = this.scene.add.text(cx, cy - 40, '', {
      fontSize: '28px', color: '#E8F4F8', fontFamily: 'monospace',
      align: 'center'
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setScrollFactor(0);
    this.titleText.setDepth(2001);
    this.titleText.setVisible(false);

    this.subtitleText = this.scene.add.text(cx, cy + 10, '', {
      fontSize: '14px', color: '#B0C4DE', fontFamily: 'monospace',
      align: 'center'
    });
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setScrollFactor(0);
    this.subtitleText.setDepth(2001);
    this.subtitleText.setVisible(false);

    this.actionButton = this.scene.add.text(cx, cy + 60, '', {
      fontSize: '20px', color: '#0A1824', fontFamily: 'monospace',
      backgroundColor: '#E8F4F8', padding: { x: 20, y: 10 }
    });
    this.actionButton.setOrigin(0.5);
    this.actionButton.setScrollFactor(0);
    this.actionButton.setDepth(2001);
    this.actionButton.setInteractive({ useHandCursor: true });
    this.actionButton.setVisible(false);
  }

  private handleLevelWon(data: { firefliesCollected: number }): void {
    if (this.state === 'defeat') return;

    this.state = 'victory';
    this.drawBackdrop();
    this.titleText.setText('Victory!');
    this.subtitleText.setText(`${data.firefliesCollected} fireflies saved`);

    const isLastLevel = this.levelIndex >= LEVELS.length - 1;
    if (isLastLevel) {
      this.actionButton.setText('You Win!');
      this.actionButton.off('pointerdown');
      this.actionButton.disableInteractive();
    } else {
      this.actionButton.setText('Next Level');
      this.actionButton.setInteractive({ useHandCursor: true });
      this.actionButton.off('pointerdown');
      this.actionButton.on('pointerdown', () => this.onNextLevel());
    }

    this.showOverlay();
  }

  private handleLevelLost(data: { reason: string }): void {
    if (this.state === 'defeat' || this.state === 'victory') return;

    this.state = 'defeat';
    this.drawBackdrop();
    this.titleText.setText('Defeat');

    const message = data.reason === 'monster_reached_goal'
      ? 'A monster reached its goal'
      : 'Not enough fireflies survived';
    this.subtitleText.setText(message);

    this.actionButton.setText('Retry');
    this.actionButton.setInteractive({ useHandCursor: true });
    this.actionButton.off('pointerdown');
    this.actionButton.on('pointerdown', () => this.onRetry());

    this.showOverlay();
  }

  private drawBackdrop(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.backdrop.clear();
    this.backdrop.fillStyle(0x0A1824, 0.75);
    this.backdrop.fillRect(0, 0, w, h);
  }

  private showOverlay(): void {
    this.backdrop.setVisible(true);
    this.titleText.setVisible(true);
    this.subtitleText.setVisible(true);
    this.actionButton.setVisible(true);
  }
}
