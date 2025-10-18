import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEvents } from '../GameEvents';

describe('GameEvents', () => {
  let events: GameEvents;

  beforeEach(() => {
    events = new GameEvents();
  });

  it('should emit and receive events', () => {
    const callback = vi.fn();
    events.on('test:event', callback);
    events.emit('test:event', { data: 'test' });

    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should handle multiple listeners', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    events.on('test:event', callback1);
    events.on('test:event', callback2);
    events.emit('test:event', 'data');

    expect(callback1).toHaveBeenCalledWith('data');
    expect(callback2).toHaveBeenCalledWith('data');
  });

  it('should remove listeners with off', () => {
    const callback = vi.fn();
    events.on('test:event', callback);
    events.off('test:event', callback);
    events.emit('test:event');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fire once listeners only once', () => {
    const callback = vi.fn();
    events.once('test:event', callback);
    events.emit('test:event');
    events.emit('test:event');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should clear all listeners for an event', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    events.on('test:event', callback1);
    events.on('test:event', callback2);
    events.clear('test:event');
    events.emit('test:event');

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should clear all events', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    events.on('event1', callback1);
    events.on('event2', callback2);
    events.clear();
    events.emit('event1');
    events.emit('event2');

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should have predefined event constants', () => {
    expect(GameEvents.ENTITY_REACHED_GOAL).toBe('entity:reachedGoal');
    expect(GameEvents.TARGET_ACQUIRED).toBe('target:acquired');
    expect(GameEvents.PATH_COMPLETED).toBe('path:completed');
  });
});
