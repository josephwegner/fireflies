import { Component, Types } from 'ecsy';
import { ECSEntity } from '@/types';

export class Target extends Component<Target> {
  target!: ECSEntity | null;

  static schema = {
    target: { type: Types.Ref, default: null }
  };
}
