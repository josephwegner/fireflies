import Phaser from 'phaser';
import GameScene from './gameScene';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#222',
  parent: 'game-container',
  scene: [GameScene]
};

const game = new Phaser.Game(config);
