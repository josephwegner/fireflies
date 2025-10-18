import { Component, Types } from 'ecsy';

export class Interaction extends Component<Interaction> {
  interactsWith!: string[];
  interactionRadius!: number;
  onInteract!: () => void;

  static schema = {
    interactsWith: { type: Types.Array, default: [] },
    interactionRadius: { type: Types.Number, default: 30 },
    onInteract: { type: Types.Ref, default: () => {} }
  };
}
