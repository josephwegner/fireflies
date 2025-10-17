import { Component, Types } from 'ecsy';

export default class TargetComponent extends Component {}

TargetComponent.schema = {
  target: { type: Types.Ref, default: null },
};
