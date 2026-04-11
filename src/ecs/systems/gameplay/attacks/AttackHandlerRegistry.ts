import type { AttackHandler } from './AttackHandler';
import { DashAttackHandler } from './DashAttackHandler';
import { PulseAttackHandler } from './PulseAttackHandler';

export class AttackHandlerRegistry {
  private static handlers = new Map<string, AttackHandler>();

  static register(type: string, handler: AttackHandler): void {
    this.handlers.set(type, handler);
  }

  static get(type: string): AttackHandler | undefined {
    return this.handlers.get(type);
  }

  static clear(): void {
    this.handlers.clear();
  }

  static initialize(): void {
    this.clear();
    this.register('dash', new DashAttackHandler());
    this.register('pulse', new PulseAttackHandler());
  }
}
