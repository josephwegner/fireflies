import { Component, Types } from 'ecsy';

export class Renderable extends Component<Renderable> {
  type!: string;
  sprite?: string;
  color!: number;
  radius!: number;
  alpha!: number;
  scale!: number;
  tint!: number;
  rotation!: number;
  rotationSpeed!: number; // radians per second

  static schema = {
    type: { type: Types.String, default: 'default' },
    sprite: { type: Types.String, default: '' },
    color: { type: Types.Number, default: 0xffffff },
    radius: { type: Types.Number, default: 5 },
    alpha: { type: Types.Number, default: 1 },
    scale: { type: Types.Number, default: 1.0 },
    tint: { type: Types.Number, default: 0xFFFFFF },
    rotation: { type: Types.Number, default: 0 },
    rotationSpeed: { type: Types.Number, default: 0 }
  };
}
