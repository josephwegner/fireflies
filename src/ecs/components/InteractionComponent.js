import { Component, Types } from 'ecsy';

export default class InteractionComponent extends Component {}

InteractionComponent.schema = {
  interactions: { type: Types.Ref, default: () => {} },
};
