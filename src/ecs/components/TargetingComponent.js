import { Component, Types } from 'ecsy';

export default class TargetingComponent extends Component {}

TargetingComponent.schema = {
  target: { type: Types.Ref, default: null },
  targetTypes: { type: Types.Array, default: [] },
  aggressionRadius: { type: Types.Number, default: 30 }
};
