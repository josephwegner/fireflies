import { Component, Types } from 'ecsy';

export default class TypeComponent extends Component {}

TypeComponent.schema = {
  type: { type: Types.String, default: 'generic' }
};