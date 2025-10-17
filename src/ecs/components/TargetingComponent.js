import { Component, Types } from 'ecsy';

export default class TargetingComponent extends Component {}

TargetingComponent.schema = {
  potentialTargets: { type: Types.Array, default: [] },
};
