import { Component, Types } from 'ecsy';

export default class PathComponent extends Component {}
PathComponent.schema = {
  currentPath: { type: Types.Array, default: [] },
  nextPath: { type: Types.Array, default: [] }
};
