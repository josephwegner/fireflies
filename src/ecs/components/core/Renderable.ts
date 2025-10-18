import { Component, Types } from 'ecsy';

export class Renderable extends Component<Renderable> {
  type!: string;
  sprite?: string;
  color!: number;
  radius!: number;

  static schema = {
    type: { type: Types.String, default: 'default' },
    sprite: { type: Types.String, default: '' },
    color: { type: Types.Number, default: 0xffffff },
    radius: { type: Types.Number, default: 5 }
  };
}
