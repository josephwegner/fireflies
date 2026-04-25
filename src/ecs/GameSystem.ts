import type { GameWorld } from './Entity';
import { gameEvents, GameEvents, type GameEventPayloads } from '@/events';

export interface GameSystem {
  update(delta: number, time: number): void;
  destroy?(): void;
}

export interface GameSystemConstructor {
  new (world: GameWorld, config: Record<string, any>): GameSystem;
}

export abstract class GameSystemBase implements GameSystem {
  private eventSubscriptions: Array<{ event: keyof GameEventPayloads; handler: (data: any) => void }> = [];

  protected listen<E extends keyof GameEventPayloads>(
    event: E,
    handler: (data: GameEventPayloads[E]) => void
  ): void {
    const bound = handler.bind(this);
    gameEvents.on(event, bound);
    this.eventSubscriptions.push({ event, handler: bound });
  }

  destroy(): void {
    for (const { event, handler } of this.eventSubscriptions) {
      gameEvents.off(event, handler);
    }
    this.eventSubscriptions = [];
  }

  abstract update(delta: number, time: number): void;
}
