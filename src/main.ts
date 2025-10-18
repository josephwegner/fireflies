import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: '#222',
  parent: 'game-container',
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
