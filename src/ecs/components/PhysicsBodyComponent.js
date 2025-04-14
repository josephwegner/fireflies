import { Component, Types } from 'ecsy';

export default class PhysicsBodyComponent extends Component {}

PhysicsBodyComponent.schema = {
  sprite: { type: Types.Ref, default: null },
  colliders: { type: Types.Array, default: [] }
}; 