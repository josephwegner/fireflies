import { Component, Types } from 'ecsy';

export default class PhysicsBodyComponent extends Component {}

PhysicsBodyComponent.schema = {
  body: { type: Types.Ref }, // Reference to Phaser physics body,
  colliders: { type: Types.Array, default: [] }
}; 