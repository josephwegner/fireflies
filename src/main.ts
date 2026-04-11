import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0A1824',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }
    }
  }
};

const game = new Phaser.Game(config);

declare global {
  interface Window {
    game: Phaser.Game;
  }
}

window.game = game;
