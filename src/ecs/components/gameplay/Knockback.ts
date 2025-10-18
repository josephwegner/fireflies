import { Component, Types } from 'ecsy';

export interface KnockbackForce {
  x: number;
  y: number;
}

export class Knockback extends Component<Knockback> {
  force!: KnockbackForce;
  duration!: number;
  elapsed!: number;

  static schema = {
    force: { type: Types.JSON, default: { x: 0, y: 0 } },
    duration: { type: Types.Number, default: 0 },
    elapsed: { type: Types.Number, default: 0 }
  };
}

