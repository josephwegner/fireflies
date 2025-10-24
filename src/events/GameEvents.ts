import { ECSEntity } from '@/types';

// Define typed event payloads
export interface GameEventPayloads {
  [GameEvents.ENTITY_REACHED_GOAL]: { entity: ECSEntity; position: { x: number; y: number } };
  [GameEvents.ENTITY_DIED]: { entity: ECSEntity; position: { x: number; y: number } };
  [GameEvents.ENTITY_SPAWNED]: { entity: ECSEntity; type: string };
  [GameEvents.TARGET_ACQUIRED]: { entity: ECSEntity; target: ECSEntity };
  [GameEvents.TARGET_LOST]: { entity: ECSEntity; target: ECSEntity };
  [GameEvents.PATH_COMPLETED]: { entity: ECSEntity; position: { x: number; y: number } };
  [GameEvents.INTERACTION_OCCURRED]: { entity: ECSEntity; target: ECSEntity; type: string };
  [GameEvents.ATTACK_STARTED]: { entity: ECSEntity; target: ECSEntity; attackType: string };
  [GameEvents.ATTACK_HIT]: { attacker: ECSEntity; target: ECSEntity; damage: number; knockbackForce?: number };
  [GameEvents.ATTACK_COMPLETED]: { entity: ECSEntity };
  [GameEvents.KNOCKBACK_APPLIED]: { entity: ECSEntity; force: { x: number; y: number } };
  [GameEvents.TENANT_ADDED_TO_LODGE]: { lodgeEntity: ECSEntity; tenantEntity: ECSEntity };
  [GameEvents.TENANT_REMOVED_FROM_LODGE]: { lodgeEntity: ECSEntity; tenantEntity: ECSEntity };
  [GameEvents.ALL_MONSTERS_DEFEATED]: {};
  [GameEvents.ENTITY_DAMAGED]: { entity: ECSEntity; damage: number };
}

type EventCallback<T = any> = (data: T) => void;

export class GameEvents {
  private listeners: Map<string, EventCallback[]> = new Map();

  // Event type constants
  static readonly ENTITY_REACHED_GOAL = 'entity:reachedGoal';
  static readonly ENTITY_DIED = 'entity:died';
  static readonly ENTITY_SPAWNED = 'entity:spawned';
  static readonly TARGET_ACQUIRED = 'target:acquired';
  static readonly TARGET_LOST = 'target:lost';
  static readonly PATH_COMPLETED = 'path:completed';
  static readonly INTERACTION_OCCURRED = 'interaction:occurred';
  static readonly ATTACK_STARTED = 'combat:attackStarted';
  static readonly ATTACK_HIT = 'combat:attackHit';
  static readonly ATTACK_COMPLETED = 'combat:attackCompleted';
  static readonly KNOCKBACK_APPLIED = 'combat:knockbackApplied';
  static readonly TENANT_ADDED_TO_LODGE = 'tenant:addedToLodge';
  static readonly TENANT_REMOVED_FROM_LODGE = 'tenant:removedFromLodge';
  static readonly ALL_MONSTERS_DEFEATED = 'victory:allMonstersDefeated';
  static readonly ENTITY_DAMAGED = 'entity:damaged';
  /**
   * Subscribe to an event with type-safe payload
   */
  on<K extends keyof GameEventPayloads>(
    event: K,
    callback: EventCallback<GameEventPayloads[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as EventCallback);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof GameEventPayloads>(
    event: K,
    callback: EventCallback<GameEventPayloads[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback as EventCallback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event with type-safe payload
   */
  emit<K extends keyof GameEventPayloads>(
    event: K,
    data: GameEventPayloads[K]
  ): void {
    console.log('[GameEvents]', event, data);
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Subscribe to an event that will only fire once
   */
  once<K extends keyof GameEventPayloads>(
    event: K,
    callback: EventCallback<GameEventPayloads[K]>
  ): void {
    const onceCallback = (data: GameEventPayloads[K]) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified
   */
  clear<K extends keyof GameEventPayloads>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Create a singleton instance
export const gameEvents = new GameEvents();
