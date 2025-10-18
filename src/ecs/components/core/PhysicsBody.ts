import { Component, Types } from 'ecsy';

export class PhysicsBody extends Component<PhysicsBody> {
  mass!: number;
  isStatic!: boolean;
  collisionRadius!: number;

  static schema = {
    mass: { type: Types.Number, default: 1 },
    isStatic: { type: Types.Boolean, default: false },
    collisionRadius: { type: Types.Number, default: 0 }
  };
}
