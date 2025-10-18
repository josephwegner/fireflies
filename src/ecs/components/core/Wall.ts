import { Component, Types } from 'ecsy';

export class Wall extends Component<Wall> {
  segments!: any[];
  thickness!: number;
  color!: number;

  static schema = {
    segments: { type: Types.Array, default: [] },
    thickness: { type: Types.Number, default: 2 },
    color: { type: Types.Number, default: 0x888888 }
  };
}
