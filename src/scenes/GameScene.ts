import Phaser from 'phaser';
import { World } from 'ecsy';
import {
  Position,
  Velocity,
  Path,
  Renderable,
  PhysicsBody,
  Destination,
  Targeting,
  Target,
  Interaction,
  Health,
  Combat,
  Wall,
  FireflyTag,
  WispTag,
  MonsterTag,
  GoalTag,
  WallTag
} from '@/ecs/components';
import {
  RenderingSystem,
  WallRenderingSystem,
  MovementSystem,
  InteractionSystem,
  TargetingSystem,
  DestinationSystem,
  WallGenerationSystem,
  DamageSystem,
  CombatSystem
} from '@/ecs/systems';
import {
  createFirefly,
  createWisp,
  createMonster,
  createGoal
} from '@/entities/factories';
import { GAME_CONFIG, PHYSICS_CONFIG } from '@/config';
import { AssetLoader } from '@/assets';
import { AttackHandlerRegistry } from '@/ecs/systems/gameplay/attacks/AttackHandlerRegistry';
import { SpatialGrid } from '@/utils';

export class GameScene extends Phaser.Scene {
  private world!: World;
  private pathfindingWorker!: Worker;
  private map!: number[][];
  private spatialGrid!: SpatialGrid;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    AssetLoader.preloadAll(this);
  }

  create(): void {
    this.world = new World();
    this.pathfindingWorker = this.createWorker();
    this.spatialGrid = new SpatialGrid(PHYSICS_CONFIG.SPATIAL_GRID_CELL_SIZE);

    this.registerComponents();
    this.createMap();
    this.registerSystems();
    this.createEntities();

    // Initialize attack handlers before creating entities
    AttackHandlerRegistry.initialize();
  }

  protected createWorker(): Worker {
    return new Worker(
      new URL('../workers/pathfinding/worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  private registerComponents(): void {
    this.world
      .registerComponent(Position)
      .registerComponent(Velocity)
      .registerComponent(Path)
      .registerComponent(Renderable)
      .registerComponent(PhysicsBody)
      .registerComponent(Destination)
      .registerComponent(Targeting)
      .registerComponent(Target)
      .registerComponent(Interaction)
      .registerComponent(Health)
      .registerComponent(Combat)
      .registerComponent(Wall)
      .registerComponent(FireflyTag)
      .registerComponent(WispTag)
      .registerComponent(MonsterTag)
      .registerComponent(GoalTag)
      .registerComponent(WallTag);
  }

  private registerSystems(): void {
    this.world
      .registerSystem(RenderingSystem, { scene: this })
      .registerSystem(WallGenerationSystem, { worker: this.pathfindingWorker, map: this.map })
      .registerSystem(InteractionSystem, { spatialGrid: this.spatialGrid })
      .registerSystem(TargetingSystem)
      .registerSystem(CombatSystem, { 
        spatialGrid: this.spatialGrid,
        scene: this,
        renderingSystem: this.world.getSystem(RenderingSystem)
      })
      .registerSystem(DamageSystem)
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem, { worker: this.pathfindingWorker })
      .registerSystem(WallRenderingSystem, { scene: this });
  }

  private createMap(): void {
    this.map = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
  }

  private createEntities(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;

    createFirefly(
      this.world,
      7 * TILE + TILE / 2,
      3 * TILE + TILE / 2
    );

    createFirefly(
      this.world,
      8 * TILE + TILE / 2,
      4 * TILE + TILE / 2
    );

    createFirefly(
      this.world,
      6 * TILE + TILE / 2,
      2 * TILE + TILE / 2
    )

    createFirefly(
      this.world,
      4 * TILE + TILE / 2,
      2 * TILE + TILE / 2
    )

    const wispPositions = [
      [10, 3],
      [2, 4],
      [3, 5],
      [11, 6],
      [9, 5]
    ];

    wispPositions.forEach(([x, y]) => {
      createWisp(
        this.world,
        x * TILE + TILE / 2,
        y * TILE + TILE / 2
      );
    });

    createMonster(
      this.world,
      9 * TILE + TILE / 2,
      4 * TILE + TILE / 2
    );

    createGoal(
      this.world,
      16 * TILE + TILE / 2,
      4 * TILE + TILE / 2,
      'firefly'
    );

    createGoal(
      this.world,
      1 * TILE + TILE / 2,
      4 * TILE + TILE / 2,
      'monster'
    );
  }

  update(time: number, delta: number): void {
    try {
      // Rebuild spatial grid each frame
      this.spatialGrid.clear();
      
      // Get all entities with Position component and insert into grid
      const positionedEntities = (this.world.entityManager as any)._entities.filter(
        (entity: any) => entity.hasComponent(Position)
      );
      
      positionedEntities.forEach((entity: any) => {
        const position = entity.getComponent(Position);
        if (position) {
          this.spatialGrid.insert(entity, position.x, position.y);
        }
      });

      // Execute all systems with populated spatial grid
      this.world.execute(delta, time);
    } catch (error) {
      console.error('[GameScene] Error during system execution:', error);
      // Game continues running even if a system crashes
    }
  }

}
