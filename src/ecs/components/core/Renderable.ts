import { Component, Types } from 'ecsy';

export class Renderable extends Component<Renderable> {
  type!: string;
  color!: number;
  radius!: number;

  static schema = {
    type: { type: Types.String, default: 'default' },
    color: { type: Types.Number, default: 0xffffff },
    radius: { type: Types.Number, default: 5 }
  };
}
