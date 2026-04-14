import { World } from 'miniplex';
import Phaser from 'phaser';
import type { Entity, GameWorld } from './Entity';
import type { GameSystem } from './GameSystem';
import type { EnergyManager } from '@/ui/EnergyManager';
import { SpatialGrid } from '@/utils/SpatialGrid';
import { PHYSICS_CONFIG } from '@/config';

// Gameplay systems
import { MovementSystem } from './systems/gameplay/MovementSystem';
import { InteractionSystem } from './systems/gameplay/InteractionSystem';
import { TargetingSystem } from './systems/gameplay/TargetingSystem';
import { CombatSystem } from './systems/gameplay/CombatSystem';
import { DamageSystem } from './systems/gameplay/DamageSystem';
import { LodgingSystem } from './systems/gameplay/LodgingSystem';
import { DestinationSystem } from './systems/gameplay/DestinationSystem';
import { WallGenerationSystem } from './systems/gameplay/WallGenerationSystem';
import { FireflyGoalSystem } from './systems/gameplay/FireflyGoalSystem';
import { VictorySystem } from './systems/gameplay/VictorySystem';
import { SpawnerSystem } from './systems/gameplay/SpawnerSystem';
import { RedirectSystem } from './systems/gameplay/RedirectSystem';
import { DefeatSystem } from './systems/gameplay/DefeatSystem';

// Rendering systems
import { RenderingSystem } from './systems/rendering/RenderingSystem';
import { WallRenderingSystem } from './systems/rendering/WallRenderingSystem';
import { ForestDecorationSystem } from './systems/rendering/ForestDecorationSystem';
import { TrailSystem } from './systems/rendering/TrailSystem';
import { WispVisualsSystem } from './systems/rendering/WispVisualsSystem';
import { CombatVisualsSystem } from './systems/rendering/CombatVisualsSystem';
import { DebugRedirectSystem } from './systems/rendering/DebugRedirectSystem';
import { ParticleEffectsSystem } from './systems/effects/ParticleEffectsSystem';

// UI systems
import { UISystem } from './systems/ui/UISystem';
import { PlacementSystem } from './systems/ui/PlacementSystem';
import { OverlaySystem } from './systems/ui/OverlaySystem';

// Attack handlers
import { AttackHandlerRegistry } from './systems/gameplay/attacks/AttackHandlerRegistry';

interface WorldManagerConfig {
  energyManager: EnergyManager;
  levelConfig: { initialEnergy: number; firefliesToWin: number; store: Record<string, { cost: number }> };
  levelIndex: number;
  onNextLevel: () => void;
  onRetry: () => void;
  debug?: boolean;
}

export class WorldManager {
  readonly world: GameWorld;
  readonly spatialGrid: SpatialGrid;
  private renderingSystems: GameSystem[] = [];
  private uiSystems: GameSystem[] = [];
  private gameplaySystems: GameSystem[] = [];
  private renderingSystem!: RenderingSystem;
  private _paused = true;

  constructor(
    private scene: Phaser.Scene,
    private pathfindingWorker: Worker,
    private map: number[][],
    private config: WorldManagerConfig
  ) {
    this.world = new World<Entity>();
    this.spatialGrid = new SpatialGrid(PHYSICS_CONFIG.SPATIAL_GRID_CELL_SIZE);

    AttackHandlerRegistry.initialize();
    this.registerSystems();
  }

  get paused(): boolean { return this._paused; }
  setPaused(paused: boolean): void { this._paused = paused; }

  private registerSystems(): void {
    // ── Rendering systems ──────────────────────────────────────────────
    this.renderingSystem = new RenderingSystem(this.world, { scene: this.scene });
    this.renderingSystems.push(this.renderingSystem);
    this.renderingSystems.push(new WallRenderingSystem(this.world, { scene: this.scene }));
    this.renderingSystems.push(new ForestDecorationSystem(this.world, { scene: this.scene, map: this.map }));
    this.renderingSystems.push(new TrailSystem(this.world, { scene: this.scene }));
    this.renderingSystems.push(new WispVisualsSystem(this.world, {}));
    this.renderingSystems.push(new CombatVisualsSystem(this.world, {
      scene: this.scene,
      renderingSystem: this.renderingSystem
    }));
    this.renderingSystems.push(new ParticleEffectsSystem(this.world, { scene: this.scene }));
    this.renderingSystems.push(new WallGenerationSystem(this.world, {
      worker: this.pathfindingWorker,
      map: this.map
    }));

    if (this.config.debug) {
      this.renderingSystems.push(new DebugRedirectSystem(this.world, { scene: this.scene }));
    }

    // ── UI systems ────────────────────────────────────────────────────
    this.uiSystems.push(new UISystem(this.world, {
      scene: this.scene,
      energyManager: this.config.energyManager,
      levelConfig: this.config.levelConfig
    }));
    this.uiSystems.push(new PlacementSystem(this.world, {
      scene: this.scene,
      energyManager: this.config.energyManager,
      levelConfig: this.config.levelConfig,
      map: this.map
    }));
    this.uiSystems.push(new OverlaySystem(this.world, {
      scene: this.scene,
      levelIndex: this.config.levelIndex,
      onNextLevel: this.config.onNextLevel,
      onRetry: this.config.onRetry
    }));

    // ── Gameplay systems ───────────────────────────────────────────────
    this.gameplaySystems.push(new SpawnerSystem(this.world, {}));
    this.gameplaySystems.push(new InteractionSystem(this.world, { spatialGrid: this.spatialGrid }));
    this.gameplaySystems.push(new TargetingSystem(this.world, {}));
    this.gameplaySystems.push(new CombatSystem(this.world, { spatialGrid: this.spatialGrid }));
    this.gameplaySystems.push(new LodgingSystem(this.world, { spatialGrid: this.spatialGrid }));
    this.gameplaySystems.push(new DamageSystem(this.world, {}));
    this.gameplaySystems.push(new MovementSystem(this.world, {}));
    this.gameplaySystems.push(new RedirectSystem(this.world, {}));
    this.gameplaySystems.push(new DestinationSystem(this.world, { worker: this.pathfindingWorker }));
    this.gameplaySystems.push(new FireflyGoalSystem(this.world, {
      firefliesToWin: this.config.levelConfig.firefliesToWin
    }));
    this.gameplaySystems.push(new DefeatSystem(this.world, {
      firefliesToWin: this.config.levelConfig.firefliesToWin
    }));
    this.gameplaySystems.push(new VictorySystem(this.world, {}));
  }

  update(delta: number, time: number): void {
    try {
      this.rebuildSpatialGrid();

      for (const system of this.renderingSystems) {
        system.update(delta, time);
      }
      for (const system of this.uiSystems) {
        system.update(delta, time);
      }
      if (!this._paused) {
        for (const system of this.gameplaySystems) {
          system.update(delta, time);
        }
      }
    } catch (error) {
      console.error('[WorldManager] Error during system execution:', error);
    }
  }

  private rebuildSpatialGrid(): void {
    this.spatialGrid.clear();
    const positioned = this.world.with('position');
    for (const entity of positioned) {
      this.spatialGrid.insert(entity, entity.position.x, entity.position.y);
    }
  }

  destroy(): void {
    const allSystems = [...this.renderingSystems, ...this.uiSystems, ...this.gameplaySystems];
    for (const system of allSystems) {
      system.destroy?.();
    }
    this.renderingSystems = [];
    this.uiSystems = [];
    this.gameplaySystems = [];
    this.world.clear();
  }
}
