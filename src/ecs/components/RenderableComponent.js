import { Component, Types } from 'ecsy';

export default class RenderableComponent extends Component {}
RenderableComponent.schema = {
  type: { type: Types.String, default: 'default' },
  color: { type: Types.Number, default: 0xffffff },
  radius: { type: Types.Number, default: 5 },
};