import { Component, Types } from 'ecsy';

export class FireflyGoal extends Component<FireflyGoal> {
  currentCount!: number;

  static schema = {
    currentCount: { type: Types.Number, default: 0 }
  };
}

