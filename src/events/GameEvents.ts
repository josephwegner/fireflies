type EventCallback = (...args: any[]) => void;

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

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event with optional data
   */
  emit(event: string, ...args: any[]): void {
    console.log('[GameEvents]', event, ...args);
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  /**
   * Subscribe to an event that will only fire once
   */
  once(event: string, callback: EventCallback): void {
    const onceCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Create a singleton instance
export const gameEvents = new GameEvents();
