import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameSystemBase } from '../GameSystem';
import { gameEvents, GameEvents } from '@/events';

class TestSystem extends GameSystemBase {
  public receivedData: any[] = [];

  constructor() {
    super();
    this.listen(GameEvents.ENTITY_DIED, this.handleEntityDied);
    this.listen(GameEvents.ATTACK_HIT, this.handleAttackHit);
  }

  private handleEntityDied(data: any): void {
    this.receivedData.push({ event: 'died', data });
  }

  private handleAttackHit(data: any): void {
    this.receivedData.push({ event: 'hit', data });
  }

  update(_delta: number, _time: number): void {}
}

class TestSystemWithDestroy extends GameSystemBase {
  public customCleanupCalled = false;

  constructor() {
    super();
    this.listen(GameEvents.LEVEL_WON, this.handleWon);
  }

  private handleWon(_data: any): void {}

  destroy(): void {
    super.destroy();
    this.customCleanupCalled = true;
  }

  update(_delta: number, _time: number): void {}
}

describe('GameSystemBase', () => {
  beforeEach(() => {
    gameEvents.clear();
  });

  it('should subscribe to events via listen()', () => {
    const system = new TestSystem();
    const payload = { entity: {} as any, position: { x: 1, y: 2 } };

    gameEvents.emit(GameEvents.ENTITY_DIED, payload);

    expect(system.receivedData).toHaveLength(1);
    expect(system.receivedData[0]).toEqual({ event: 'died', data: payload });
  });

  it('should support multiple event subscriptions', () => {
    const system = new TestSystem();

    gameEvents.emit(GameEvents.ENTITY_DIED, { entity: {} as any, position: { x: 0, y: 0 } });
    gameEvents.emit(GameEvents.ATTACK_HIT, { attacker: {} as any, target: {} as any, damage: 10 });

    expect(system.receivedData).toHaveLength(2);
    expect(system.receivedData[0].event).toBe('died');
    expect(system.receivedData[1].event).toBe('hit');
  });

  it('should unsubscribe all events on destroy()', () => {
    const system = new TestSystem();
    system.destroy();

    gameEvents.emit(GameEvents.ENTITY_DIED, { entity: {} as any, position: { x: 0, y: 0 } });
    gameEvents.emit(GameEvents.ATTACK_HIT, { attacker: {} as any, target: {} as any, damage: 10 });

    expect(system.receivedData).toHaveLength(0);
  });

  it('should allow super.destroy() when overriding destroy()', () => {
    const system = new TestSystemWithDestroy();
    system.destroy();

    expect(system.customCleanupCalled).toBe(true);

    const listener = vi.fn();
    gameEvents.on(GameEvents.LEVEL_WON, listener);
    gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 5 });

    // The system's handler should NOT have fired (unsubscribed by super.destroy())
    // Only our test listener should fire
    expect(listener).toHaveBeenCalledOnce();
  });

  it('should bind handlers to the correct this context', () => {
    const system = new TestSystem();
    const payload = { entity: {} as any, position: { x: 5, y: 10 } };

    gameEvents.emit(GameEvents.ENTITY_DIED, payload);

    // If binding failed, receivedData would not be populated (would throw)
    expect(system.receivedData).toHaveLength(1);
  });
});
