import { Component, Types } from 'ecsy';

export default class DestinationComponent extends Component {}

DestinationComponent.schema = {
  for: { type: Types.Array },
};
