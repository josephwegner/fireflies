import { Component, Types } from 'ecsy';

export default class PositionComponent extends Component {}
PositionComponent.schema = {
  x: { type: Types.Number, default: 0 },
  y: { type: Types.Number, default: 0 }
};
