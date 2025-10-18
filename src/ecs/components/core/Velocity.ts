import { Component, Types } from 'ecsy';

export class Velocity extends Component<Velocity> {
  vx!: number;
  vy!: number;

  static schema = {
    vx: { type: Types.Number, default: 0 },
    vy: { type: Types.Number, default: 0 }
  };
}
