import { Component, Types } from 'ecsy';

export default class EntityComponent extends Component {}

EntityComponent.schema = {
  entity: { type: Types.Ref, default: null },
};
