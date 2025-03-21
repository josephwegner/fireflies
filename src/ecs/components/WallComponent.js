import { Component, Types } from 'ecsy';

export default class WallComponent extends Component {}

WallComponent.schema = {
  // Store wall segments as arrays of points
  segments: { type: Types.Array },
  thickness: { type: Types.Number, default: 2 },
  color: { type: Types.Number, default: 0x333333 }
}; 