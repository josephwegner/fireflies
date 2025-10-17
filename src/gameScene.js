import Phaser from 'phaser';
import { World } from 'ecsy';
import PositionComponent from './ecs/components/PositionComponent';
import VelocityComponent from './ecs/components/VelocityComponent';
import PathComponent from './ecs/components/PathComponent';
import RenderableComponent from './ecs/components/RenderableComponent';
import WallComponent from './ecs/components/WallComponent';
import MovementSystem from './ecs/systems/MovementSystem';
import DestinationSystem from './ecs/systems/DestinationSystem';
import WallGenerationSystem from './ecs/systems/WallGenerationSystem';
import PhysicsSystem from './ecs/systems/PhysicsSystem';
import PhysicsBodyComponent from './ecs/components/PhysicsBodyComponent';
import TypeComponent from './ecs/components/TypeComponent';
import DestinationComponent from './ecs/components/DestinationComponent.js';
import TargetingComponent from './ecs/components/TargetingComponent';
import TargetComponent from './ecs/components/TargetComponent';
import EntityComponent from './ecs/components/EntityComponent';
import InteractionComponent from './ecs/components/InteractionComponent';
import DebugSystem from './ecs/systems/DebugSystem';
import TargetingSystem from './ecs/systems/TargetingSystem';
import TargetSystem from './ecs/systems/TargetSystem';
import Entities from './entities/index.js';

const TILE_SIZE = 32;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.entities = new Set(); // Track entities manually
    this.tileSize = TILE_SIZE; // Make tileSize accessible to systems
  }

  create() {
    this.world = new World();
    this.world.scene = this;
    this.pathfindingWorker = new Worker(new URL('./workers/pathfinding/worker.js', import.meta.url));
    
    // Initialize entity groups
    this.entityGroup = this.physics.add.group();
    this.wallGroup = this.physics.add.group({
      immovable: true
    });
    
    // Register all components
    this.world
      .registerComponent(PositionComponent)
      .registerComponent(VelocityComponent)
      .registerComponent(DestinationComponent)
      .registerComponent(PathComponent)
      .registerComponent(RenderableComponent)
      .registerComponent(WallComponent)
      .registerComponent(PhysicsBodyComponent)
      .registerComponent(TypeComponent)
      .registerComponent(EntityComponent)
      .registerComponent(InteractionComponent)
      .registerComponent(TargetingComponent)
      .registerComponent(TargetComponent)
      .registerSystem(WallGenerationSystem)
      .registerSystem(PhysicsSystem, {
        physics: this.physics,
        scene: this,
        tileSize: this.tileSize
      })
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem)
      .registerSystem(TargetingSystem)
      .registerSystem(TargetSystem)

    if (this.game.fireflies_debug) {
      this.world.registerSystem(DebugSystem, { tileSize: TILE_SIZE })
    }

    // Create initial entities
    this.entities.add(new Entities.firefly(
      this.world,
      1 * TILE_SIZE + (TILE_SIZE / 2),
      3 * TILE_SIZE + (TILE_SIZE / 2)
    ).ecsyEntity)

    const wisps = [
      [10, 3],
      [2, 4],
      [3, 5],
      [11, 6],
      [9, 5] 
    ]

    wisps.forEach(wisp => {
      this.entities.add(new Entities.wisp(
        this.world,
        wisp[0] * TILE_SIZE + (TILE_SIZE / 2),
        wisp[1] * TILE_SIZE + (TILE_SIZE / 2)
      ).ecsyEntity)
    })

    this.entities.add(new Entities.monster(
      this.world,
      17 * TILE_SIZE + (TILE_SIZE / 2),
      4 * TILE_SIZE + (TILE_SIZE / 2)
    ).ecsyEntity)
    
    this.entities.add(new Entities.goal(
      this.world,
      16 * TILE_SIZE + (TILE_SIZE / 2),
      4 * TILE_SIZE + (TILE_SIZE / 2),
      'firefly'
    ).ecsyEntity)

    this.entities.add(new Entities.goal(
      this.world,
      1 * TILE_SIZE + (TILE_SIZE / 2),
      4 * TILE_SIZE + (TILE_SIZE / 2),
      'monster',
    ).ecsyEntity)

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

    // Listen for messages from the worker
    this.pathfindingWorker.onmessage = (e) => {
      if (e.data.entityId !== undefined && e.data.path.length > 0) {
        // Handle path response (this part remains similar to your existing code)
        const entity = Array.from(this.entities).find(entity => entity.id === e.data.entityId);
        if (entity) {
          const pathComp = entity.getMutableComponent(PathComponent);
          if (pathComp) {
            if (e.data.pathType === 'current') {
              pathComp.currentPath = e.data.path;
            } else if (e.data.pathType === 'next') {
              pathComp.nextPath = e.data.path;
            }
          }
        }
      }
    };
  }

  update(time, delta) {
    this.world.execute(delta, time);
  }

  preload() {
    this.load.image('firefly', 'assets/images/png/firefly.png');
    this.load.image('goal', 'assets/images/png/firefly.png');
    this.load.image('wisp', 'assets/images/png/wisp.png');
    this.load.image('monster', 'assets/images/png/monster.png');
  }
}
