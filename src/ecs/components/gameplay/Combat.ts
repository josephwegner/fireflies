import { Component, Types } from 'ecsy';

export enum CombatState {
  IDLE = 'IDLE',
  CHARGING = 'CHARGING',
  ATTACKING = 'ATTACKING',
  RECOVERING = 'RECOVERING'
}

export interface AttackPattern {
  handlerType: 'dash' | 'pulse';
  chargeTime: number;
  attackDuration: number;
  recoveryTime: number;
  damage: number;
  knockbackForce?: number;
  dashSpeed?: number;
  radius?: number;
  targetTags?: string[];
  color?: number; // Color for visual effects (pulse attacks)
}

export class Combat extends Component<Combat> {
  state!: CombatState;
  chargeTime!: number;
  attackElapsed!: number;
  recoveryElapsed!: number;
  attackPattern!: AttackPattern;
  hasHit!: boolean;

  static schema = {
    state: { type: Types.String, default: CombatState.IDLE },
    chargeTime: { type: Types.Number, default: 0 },
    attackElapsed: { type: Types.Number, default: 0 },
    recoveryElapsed: { type: Types.Number, default: 0 },
    attackPattern: { type: Types.JSON, default: {} },
    hasHit: { type: Types.Boolean, default: false }
  };
}

