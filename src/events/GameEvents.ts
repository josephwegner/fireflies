import type { Entity, AttackPattern } from '@/ecs/Entity';
import { logger } from '@/utils/logger';

export interface GameEventPayloads {
  [GameEvents.ENTITY_REACHED_GOAL]: { entity: Entity; position: { x: number; y: number } };
  [GameEvents.ENTITY_DIED]: { entity: Entity; position: { x: number; y: number } };
  [GameEvents.ENTITY_SPAWNED]: { entity: Entity; type: string };
  [GameEvents.TARGET_ACQUIRED]: { entity: Entity; target: Entity };
  [GameEvents.TARGET_LOST]: { entity: Entity; target: Entity };
  [GameEvents.PATH_COMPLETED]: { entity: Entity; position: { x: number; y: number } };
  [GameEvents.INTERACTION_OCCURRED]: { entity: Entity; target: Entity; type: string };
  [GameEvents.ATTACK_STARTED]: { attacker: Entity; target: Entity };
  [GameEvents.ATTACK_HIT]: { attacker: Entity; target: Entity; damage: number; knockbackForce?: number };
  [GameEvents.ATTACK_COMPLETED]: { attacker: Entity };
  [GameEvents.KNOCKBACK_APPLIED]: { entity: Entity; force: { x: number; y: number } };
  [GameEvents.TENANT_ADDED_TO_LODGE]: { lodgeEntity: Entity; tenantEntity: Entity };
  [GameEvents.TENANT_REMOVED_FROM_LODGE]: { lodgeEntity: Entity; tenantEntity: Entity };
  [GameEvents.ALL_MONSTERS_DEFEATED]: {};
  [GameEvents.ENTITY_DAMAGED]: { entity: Entity; damage: number };

  // Level flow events
  [GameEvents.LEVEL_WON]: { firefliesCollected: number };
  [GameEvents.LEVEL_LOST]: { reason: 'monster_reached_goal' | 'insufficient_fireflies' };
  [GameEvents.GAME_STARTED]: {};

  // Combat visual events (Phase 1: decouple combat from rendering)
  [GameEvents.COMBAT_CHARGING]: { entity: Entity; attackPattern: AttackPattern; progress: number };
  [GameEvents.COMBAT_ATTACK_BURST]: { entity: Entity; attackPattern: AttackPattern; position: { x: number; y: number } };
  [GameEvents.COMBAT_RECOVERING]: { entity: Entity; attackPattern: AttackPattern; progress: number };
  [GameEvents.COMBAT_CLEANUP]: { entity: Entity; attackPattern: AttackPattern };

  // Resource & placement events
  [GameEvents.ENERGY_CHANGED]: { current: number };
  [GameEvents.PLACEMENT_STARTED]: { itemType: string; cost: number };
  [GameEvents.PLACEMENT_COMPLETED]: { itemType: string; x: number; y: number };
  [GameEvents.PLACEMENT_CANCELLED]: { itemType: string };

  // Building events
  [GameEvents.BUILD_SITE_STARTED]: { entity: Entity; siteIndex: number };
  [GameEvents.BUILD_SITE_COMPLETED]: { entity: Entity; siteIndex: number };
  [GameEvents.BUILD_COMPLETE]: { entity: Entity };

  // Wall events
  [GameEvents.WALL_BLUEPRINT_PLACED]: { entity: Entity };
  [GameEvents.WALL_ACTIVATED]: { entity: Entity };
  [GameEvents.WALL_DESTROYED]: { entity: Entity; position: { x: number; y: number } };
  [GameEvents.NAVMESH_UPDATED]: {};
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

  // Level flow events
  static readonly LEVEL_WON = 'level:won';
  static readonly LEVEL_LOST = 'level:lost';
  static readonly GAME_STARTED = 'game:started';

  // Combat visual events
  static readonly COMBAT_CHARGING = 'combat:visual:charging';
  static readonly COMBAT_ATTACK_BURST = 'combat:visual:burst';
  static readonly COMBAT_RECOVERING = 'combat:visual:recovering';
  static readonly COMBAT_CLEANUP = 'combat:visual:cleanup';

  // Resource & placement events
  static readonly ENERGY_CHANGED = 'energy:changed';
  static readonly PLACEMENT_STARTED = 'placement:started';
  static readonly PLACEMENT_COMPLETED = 'placement:completed';
  static readonly PLACEMENT_CANCELLED = 'placement:cancelled';

  // Building events
  static readonly BUILD_SITE_STARTED = 'build:siteStarted';
  static readonly BUILD_SITE_COMPLETED = 'build:siteCompleted';
  static readonly BUILD_COMPLETE = 'build:complete';

  // Wall events
  static readonly WALL_BLUEPRINT_PLACED = 'wall:blueprintPlaced';
  static readonly WALL_ACTIVATED = 'wall:activated';
  static readonly WALL_DESTROYED = 'wall:destroyed';
  static readonly NAVMESH_UPDATED = 'navmesh:updated';

  on<K extends keyof GameEventPayloads>(
    event: K,
    callback: EventCallback<GameEventPayloads[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as EventCallback);
  }

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

  emit<K extends keyof GameEventPayloads>(
    event: K,
    data: GameEventPayloads[K]
  ): void {
    logger.debug('GameEvents', String(event));
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

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

  clear<K extends keyof GameEventPayloads>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const gameEvents = new GameEvents();
