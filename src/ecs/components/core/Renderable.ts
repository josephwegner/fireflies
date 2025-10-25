import { Component, Types } from 'ecsy';

export interface GlowConfig {
  radius: number;
  color: number;
  intensity: number;
  pulse?: {
    enabled: boolean;
    speed: number; // cycles per second
    minIntensity: number;
    maxIntensity: number;
  };
}

export class Renderable extends Component<Renderable> {
  type!: string;
  sprite?: string;
  color!: number;
  radius!: number;
  alpha!: number;
  scale!: number;
  tint!: number;
  rotation!: number;
  rotationSpeed!: number; // radians per second
  glow?: GlowConfig;
  depth!: number; // Z-index for rendering order
  offsetY!: number; // Vertical offset for sprite positioning (positive = up)

  static schema = {
    type: { type: Types.String, default: 'default' },
    sprite: { type: Types.String, default: '' },
    color: { type: Types.Number, default: 0xffffff },
    radius: { type: Types.Number, default: 5 },
    alpha: { type: Types.Number, default: 1 },
    scale: { type: Types.Number, default: 1.0 },
    tint: { type: Types.Number, default: 0xFFFFFF },
    rotation: { type: Types.Number, default: 0 },
    rotationSpeed: { type: Types.Number, default: 0 },
    glow: { type: Types.JSON, default: null },
    depth: { type: Types.Number, default: 0 },
    offsetY: { type: Types.Number, default: 0 }
  };
}
