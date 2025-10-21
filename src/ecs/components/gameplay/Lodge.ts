import { Component, Types } from 'ecsy';
import { ECSEntity } from '@/types';

export class Lodge extends Component<Lodge> {
  static schema = {
    tenants: { type: Types.Array, default: [] },
    allowedTenants: { type: Types.Array, default: [] },
    maxTenants: { type: Types.Number, default: 2 }
  };
}
