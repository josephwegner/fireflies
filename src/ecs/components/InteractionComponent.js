import { Component, Types } from 'ecsy';

export default class InteractionComponent extends Component {}

InteractionComponent.schema = {
  interactsWith: { type: Types.Array, default: [] },
  interactionRadius: { type: Types.Number, default: 30 },
  onInteract: { type: Types.Ref, default: () => {} },
};
