import { Component, Types } from 'ecsy';

export class Destination extends Component<Destination> {
  for!: string[];

  static schema = {
    for: { type: Types.Array, default: [] }
  };
}
