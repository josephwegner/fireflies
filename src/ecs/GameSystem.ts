import type Phaser from 'phaser';
import type { GameWorld } from './Entity';
import type { SpatialGrid } from '@/utils/SpatialGrid';
import type { PathfindingService } from './systems/gameplay/PathfindingService';
import type { EnergyManager } from '@/ui/EnergyManager';
import type { SoundEngine } from './systems/audio/SoundEngine';
import type { RenderingSystem } from './systems/rendering/RenderingSystem';
import { gameEvents, GameEvents, type GameEventPayloads } from '@/events';

export interface SystemConfig {
  scene: Phaser.Scene;
  worker: Worker;
  map: number[][];
  spatialGrid: SpatialGrid;
  pathfinding: PathfindingService;
  energyManager: EnergyManager;
  levelConfig: { initialEnergy: number; firefliesToWin: number; store: Record<string, { cost: number }> };
  levelIndex: number;
  firefliesToWin: number;
  onNextLevel: () => void;
  onRetry: () => void;
  soundEngine: SoundEngine;
  renderingSystem: RenderingSystem;
}

export interface GameSystem {
  update(delta: number, time: number): void;
  destroy?(): void;
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
