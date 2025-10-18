import { Component, Types } from 'ecsy';
import Phaser from 'phaser';

export class Renderable extends Component<Renderable> {
  type!: string;
  color!: number;
  radius!: number;
  sprite!: Phaser.GameObjects.Sprite | null;

  static schema = {
    type: { type: Types.String, default: 'default' },
    color: { type: Types.Number, default: 0xffffff },
    radius: { type: Types.Number, default: 5 },
    sprite: { type: Types.Ref, default: null }
  };
}
