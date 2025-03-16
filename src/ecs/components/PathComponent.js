import { Component, Types } from 'ecsy';

export default class PathComponent extends Component {}
PathComponent.schema = {
  path: { type: Types.Array, default: [] }
};
