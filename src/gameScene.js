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
import DebugSystem from './ecs/systems/DebugSystem';
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
      .registerComponent(TargetingComponent)
      .registerSystem(WallGenerationSystem)
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem)
      .registerSystem(PhysicsSystem, { 
        physics: this.physics, 
        scene: this,
        tileSize: this.tileSize
      })

    if (this.game.fireflies_debug) {
      this.world.registerSystem(DebugSystem, { tileSize: TILE_SIZE })
    }

    // Create initial entities
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1 * TILE_SIZE + (TILE_SIZE / 2), 3 * TILE_SIZE + (TILE_SIZE / 2)));
    /*this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 3));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 3));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 4));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 4));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 4));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 5));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 5));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 5));*/
    
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 10 * TILE_SIZE + (TILE_SIZE / 2), 3 * TILE_SIZE + (TILE_SIZE / 2)));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 2 * TILE_SIZE + (TILE_SIZE / 2), 4 * TILE_SIZE + (TILE_SIZE / 2)));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 3 * TILE_SIZE + (TILE_SIZE / 2), 5 * TILE_SIZE + (TILE_SIZE / 2)));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 11 * TILE_SIZE + (TILE_SIZE / 2), 6 * TILE_SIZE + (TILE_SIZE / 2)));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 9 * TILE_SIZE + (TILE_SIZE / 2), 5 * TILE_SIZE + (TILE_SIZE / 2)));

    this.entities.add(Entities.monster.createECSYEntity(this.world, 17 * TILE_SIZE + (TILE_SIZE / 2), 4 * TILE_SIZE + (TILE_SIZE / 2)))
    
    this.entities.add(Entities.goal.createECSYEntity(this.world, 16 * TILE_SIZE + (TILE_SIZE / 2), 4 * TILE_SIZE + (TILE_SIZE / 2), 'firefly'));
    this.entities.add(Entities.goal.createECSYEntity(this.world, 1 * TILE_SIZE + (TILE_SIZE / 2), 4 * TILE_SIZE + (TILE_SIZE / 2), 'monster'))

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
