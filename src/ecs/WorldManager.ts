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

// Rendering systems
import { RenderingSystem } from './systems/rendering/RenderingSystem';
import { WallRenderingSystem } from './systems/rendering/WallRenderingSystem';
import { ForestDecorationSystem } from './systems/rendering/ForestDecorationSystem';
import { TrailSystem } from './systems/rendering/TrailSystem';
import { WispVisualsSystem } from './systems/rendering/WispVisualsSystem';
import { CombatVisualsSystem } from './systems/rendering/CombatVisualsSystem';
import { ParticleEffectsSystem } from './systems/effects/ParticleEffectsSystem';

// UI systems
import { UISystem } from './systems/ui/UISystem';
import { PlacementSystem } from './systems/ui/PlacementSystem';

// Attack handlers
import { AttackHandlerRegistry } from './systems/gameplay/attacks/AttackHandlerRegistry';

interface WorldManagerConfig {
  energyManager: EnergyManager;
  levelConfig: { initialEnergy: number; store: Record<string, { cost: number }> };
}

export class WorldManager {
  readonly world: GameWorld;
  readonly spatialGrid: SpatialGrid;
  private systems: GameSystem[] = [];
  private renderingSystem!: RenderingSystem;

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

  private registerSystems(): void {
    // ── Rendering systems ──────────────────────────────────────────────
    // Run first so sprites exist before gameplay systems emit events.
    // RenderingSystem must be first — CombatVisualsSystem needs it to look up sprite containers.
    this.renderingSystem = new RenderingSystem(this.world, { scene: this.scene });
    this.systems.push(this.renderingSystem);
    this.systems.push(new WallRenderingSystem(this.world, { scene: this.scene }));
    this.systems.push(new ForestDecorationSystem(this.world, { scene: this.scene, map: this.map }));
    this.systems.push(new TrailSystem(this.world, { scene: this.scene }));
    this.systems.push(new WispVisualsSystem(this.world, {}));
    this.systems.push(new CombatVisualsSystem(this.world, {
      scene: this.scene,
      renderingSystem: this.renderingSystem
    }));
    this.systems.push(new ParticleEffectsSystem(this.world, { scene: this.scene }));

    // ── UI systems ────────────────────────────────────────────────────
    this.systems.push(new UISystem(this.world, {
      scene: this.scene,
      energyManager: this.config.energyManager,
      levelConfig: this.config.levelConfig
    }));
    this.systems.push(new PlacementSystem(this.world, {
      scene: this.scene,
      energyManager: this.config.energyManager,
      levelConfig: this.config.levelConfig,
      map: this.map
    }));

    // ── Gameplay systems ───────────────────────────────────────────────
    // Order matters here:
    //   WallGeneration → runs once to build nav mesh
    //   Spawner        → spawns new entities from spawner queues
    //   Interaction    → populates targeting.potentialTargets via spatial grid
    //   Targeting      → picks a target from potentialTargets
    //   Combat         → uses target to run attack state machine
    //   Lodging        → checks spatial proximity for tenant arrival
    //   Damage         → processes ATTACK_HIT events from combat
    //   Movement       → moves entities along paths, emits PATH_COMPLETED
    //   Destination    → requests new paths from worker when current path ends
    //   FireflyGoal    → checks if fireflies reached the goal
    //   Victory        → checks if all monsters are dead (event-driven)
    this.systems.push(new WallGenerationSystem(this.world, {
      worker: this.pathfindingWorker,
      map: this.map
    }));
    this.systems.push(new SpawnerSystem(this.world, {}));
    this.systems.push(new InteractionSystem(this.world, { spatialGrid: this.spatialGrid }));
    this.systems.push(new TargetingSystem(this.world, {}));
    this.systems.push(new CombatSystem(this.world, { spatialGrid: this.spatialGrid }));
    this.systems.push(new LodgingSystem(this.world, { spatialGrid: this.spatialGrid }));
    this.systems.push(new DamageSystem(this.world, {}));
    this.systems.push(new MovementSystem(this.world, {}));
    this.systems.push(new DestinationSystem(this.world, { worker: this.pathfindingWorker }));
    this.systems.push(new FireflyGoalSystem(this.world, {}));
    this.systems.push(new VictorySystem(this.world, {}));
  }

  update(delta: number, time: number): void {
    try {
      this.rebuildSpatialGrid();

      for (const system of this.systems) {
        system.update(delta, time);
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
    for (const system of this.systems) {
      system.destroy?.();
    }
    this.systems = [];
    this.world.clear();
  }
}
