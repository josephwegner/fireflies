import { Component, Types } from 'ecsy';

export class Health extends Component<Health> {
  currentHealth!: number;
  maxHealth!: number;
  isDead!: boolean;

  static schema = {
    currentHealth: { type: Types.Number, default: 100 },
    maxHealth: { type: Types.Number, default: 100 },
    isDead: { type: Types.Boolean, default: false }
  };
}

