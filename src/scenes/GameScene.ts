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
  Knockback,
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
  KnockbackSystem,
  CombatSystem
} from '@/ecs/systems';
import {
  createFirefly,
  createWisp,
  createMonster,
  createGoal
} from '@/entities/factories';
import { GAME_CONFIG } from '@/config';
import { AssetLoader } from '@/assets';
import { AttackHandlerRegistry } from '@/ecs/systems/gameplay/attacks/AttackHandlerRegistry';

export class GameScene extends Phaser.Scene {
  private world!: World;
  private pathfindingWorker!: Worker;
  private map!: number[][];

  constructor() {
    super('GameScene');
  }

  preload(): void {
    AssetLoader.preloadAll(this);
  }

  create(): void {
    this.world = new World();
    this.pathfindingWorker = this.createWorker();

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
      .registerComponent(Knockback)
      .registerComponent(Wall)
      .registerComponent(FireflyTag)
      .registerComponent(WispTag)
      .registerComponent(MonsterTag)
      .registerComponent(GoalTag)
      .registerComponent(WallTag);
  }

  private registerSystems(): void {
    this.world
      .registerSystem(WallGenerationSystem, { worker: this.pathfindingWorker, map: this.map })
      .registerSystem(InteractionSystem)
      .registerSystem(TargetingSystem)
      .registerSystem(CombatSystem)
      .registerSystem(DamageSystem)
      .registerSystem(KnockbackSystem)
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem, { worker: this.pathfindingWorker })
      .registerSystem(WallRenderingSystem, { scene: this })
      .registerSystem(RenderingSystem, { scene: this });
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
      1 * TILE + TILE / 2,
      3 * TILE + TILE / 2
    );

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
      17 * TILE + TILE / 2,
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
      this.world.execute(delta, time);
    } catch (error) {
      console.error('[GameScene] Error during system execution:', error);
      // Game continues running even if a system crashes
    }
  }

}
