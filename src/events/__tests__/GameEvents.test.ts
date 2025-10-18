import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEvents } from '../GameEvents';

describe('GameEvents', () => {
  let events: GameEvents;

  beforeEach(() => {
    events = new GameEvents();
  });

  it('should emit and receive events', () => {
    const callback = vi.fn();
    events.on(GameEvents.PATH_COMPLETED, callback);
    events.emit(GameEvents.PATH_COMPLETED, {
      entity: { id: 1 } as any,
      position: { x: 10, y: 20 }
    });

    expect(callback).toHaveBeenCalledWith({
      entity: { id: 1 },
      position: { x: 10, y: 20 }
    });
  });

  it('should handle multiple listeners', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const testData = { entity: { id: 1 } as any, target: { id: 2 } as any };

    events.on(GameEvents.TARGET_ACQUIRED, callback1);
    events.on(GameEvents.TARGET_ACQUIRED, callback2);
    events.emit(GameEvents.TARGET_ACQUIRED, testData);

    expect(callback1).toHaveBeenCalledWith(testData);
    expect(callback2).toHaveBeenCalledWith(testData);
  });

  it('should remove listeners with off', () => {
    const callback = vi.fn();
    events.on(GameEvents.TARGET_ACQUIRED, callback);
    events.off(GameEvents.TARGET_ACQUIRED, callback);
    events.emit(GameEvents.TARGET_ACQUIRED, {
      entity: { id: 1 } as any,
      target: { id: 2 } as any
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fire once listeners only once', () => {
    const callback = vi.fn();
    const testData = { entity: { id: 1 } as any, position: { x: 10, y: 20 } };

    events.once(GameEvents.PATH_COMPLETED, callback);
    events.emit(GameEvents.PATH_COMPLETED, testData);
    events.emit(GameEvents.PATH_COMPLETED, testData);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should clear all listeners for an event', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    events.on(GameEvents.PATH_COMPLETED, callback1);
    events.on(GameEvents.PATH_COMPLETED, callback2);
    events.clear(GameEvents.PATH_COMPLETED);
    events.emit(GameEvents.PATH_COMPLETED, {
      entity: { id: 1 } as any,
      position: { x: 10, y: 20 }
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should clear all events', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    events.on(GameEvents.PATH_COMPLETED, callback1);
    events.on(GameEvents.TARGET_ACQUIRED, callback2);
    events.clear();
    events.emit(GameEvents.PATH_COMPLETED, {
      entity: { id: 1 } as any,
      position: { x: 10, y: 20 }
    });
    events.emit(GameEvents.TARGET_ACQUIRED, {
      entity: { id: 1 } as any,
      target: { id: 2 } as any
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should have predefined event constants', () => {
    expect(GameEvents.ENTITY_REACHED_GOAL).toBe('entity:reachedGoal');
    expect(GameEvents.TARGET_ACQUIRED).toBe('target:acquired');
    expect(GameEvents.PATH_COMPLETED).toBe('path:completed');
  });
});
