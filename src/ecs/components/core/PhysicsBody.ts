import { Component, Types } from 'ecsy';
import Phaser from 'phaser';

export class PhysicsBody extends Component<PhysicsBody> {
  spriteGroup!: Phaser.GameObjects.Container | null;
  interactionSprite!: Phaser.GameObjects.Arc | null;
  renderedSprite!: Phaser.GameObjects.Arc | null;

  static schema = {
    spriteGroup: { type: Types.Ref, default: null },
    interactionSprite: { type: Types.Ref, default: null },
    renderedSprite: { type: Types.Ref, default: null }
  };
}
