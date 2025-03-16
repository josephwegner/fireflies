import { Component, Types } from 'ecsy';

export default class VelocityComponent extends Component {}
VelocityComponent.schema = {
  vx: { type: Types.Number, default: 0 },
  vy: { type: Types.Number, default: 0 }
};
