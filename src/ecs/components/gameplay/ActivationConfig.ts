import { Component, Types } from 'ecsy';

export interface ComponentAddition {
  component: any;
  config: any;
}

export class ActivationConfig extends Component<ActivationConfig> {
  onActivate!: ComponentAddition[];
  onDeactivate!: any[];

  static schema = {
    onActivate: { type: Types.Array, default: [] },
    onDeactivate: { type: Types.Array, default: [] }
  };
}