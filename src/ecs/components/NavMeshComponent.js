import { Component, Types } from 'ecsy';

export default class NavMeshComponent extends Component {}

NavMeshComponent.schema = {
  polygons: { type: Types.Array, default: [] },
  connections: { type: Types.Array, default: [] },
  navMeshInstance: { type: Types.Ref, default: null }
}; 