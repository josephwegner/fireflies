import { Component, Types } from 'ecsy';

export interface TrailConfig {
  length: number; // Number of trail points to maintain
  fadeTime: number; // Time in ms for trail to fade out
  color: number;
  width: number; // Width of trail segments
  minAlpha: number; // Minimum alpha before point is removed
}

export class Trail extends Component<Trail> {
  enabled!: boolean;
  config!: TrailConfig;
  points!: Array<{ x: number; y: number; timestamp: number }>;

  static schema = {
    enabled: { type: Types.Boolean, default: false },
    config: { type: Types.JSON, default: null },
    points: { type: Types.Array, default: [] }
  };
}

