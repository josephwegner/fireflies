import { Component, Types } from 'ecsy';

export default class PhysicsBodyComponent extends Component {}

PhysicsBodyComponent.schema = {
  spriteGroup: { type: Types.Ref, default: null },
  interactionSprite: { type: Types.Ref, default: null },
  renderedSprite: { type: Types.Ref, default: null }
}; 