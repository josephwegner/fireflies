import type { GameWorld } from './Entity';

export interface GameSystem {
  update(delta: number, time: number): void;
  destroy?(): void;
}

export interface GameSystemConstructor {
  new (world: GameWorld, config: Record<string, any>): GameSystem;
}
