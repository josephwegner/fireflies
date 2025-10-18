import { Component, Types } from 'ecsy';
import { ECSEntity } from '@/types';

export class Targeting extends Component<Targeting> {
  potentialTargets!: ECSEntity[];

  static schema = {
    potentialTargets: { type: Types.Array, default: [] }
  };
}
