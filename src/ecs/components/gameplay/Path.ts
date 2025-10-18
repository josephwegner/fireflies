import { Component, Types } from 'ecsy';
import { Position } from '@/types';

export class Path extends Component<Path> {
  currentPath!: Position[];
  nextPath!: Position[];
  direction!: string;

  static schema = {
    currentPath: { type: Types.Array, default: [] },
    nextPath: { type: Types.Array, default: [] },
    direction: { type: Types.String, default: 'r' }
  };
}
