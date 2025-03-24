import Phaser from 'phaser';
import { World } from 'ecsy';
import PositionComponent from './ecs/components/PositionComponent';
import VelocityComponent from './ecs/components/VelocityComponent';
import PathComponent from './ecs/components/PathComponent';
import RenderableComponent from './ecs/components/RenderableComponent';
import WallComponent from './ecs/components/WallComponent';
import MovementSystem from './ecs/systems/MovementSystem';
import DestinationSystem from './ecs/systems/DestinationSystem';
import RenderSystem from './ecs/systems/RenderSystem';
import WallGenerationSystem from './ecs/systems/WallGenerationSystem';
import PhysicsSystem from './ecs/systems/PhysicsSystem';
import PhysicsBodyComponent from './ecs/components/PhysicsBodyComponent';
import TypeComponent from './ecs/components/TypeComponent';
import InteractionComponent from './ecs/components/InteractionComponent';
import { createFirefly, createDestination } from './ecs/entityFactory';
import PhaserBridgeSystem from './ecs/systems/PhaserBridgeSystem';
const TILE_SIZE = 32;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.entities = new Set(); // Track entities manually
    this.tileSize = TILE_SIZE; // Make tileSize accessible to systems
  }

  create() {
    this.world = new World();
    this.world.scene = this

    this.world
      .registerComponent(PositionComponent)
      .registerComponent(VelocityComponent)
      .registerComponent(PathComponent)
      .registerComponent(RenderableComponent)
      .registerComponent(WallComponent)
      .registerComponent(PhysicsBodyComponent)
      .registerComponent(TypeComponent)
      .registerComponent(InteractionComponent)
      .registerSystem(WallGenerationSystem)
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem)
      .registerSystem(RenderSystem)
      .registerSystem(PhysicsSystem, { physics: this.physics, tileSize: this.tileSize})
      .registerSystem(PhaserBridgeSystem, { 
        scene: this, 
        tileSize: this.tileSize
      });

    // Create initial entities
    this.entities.add(createFirefly(this.world, 1, 3));
    this.entities.add(createFirefly(this.world, 1, 3));
    this.entities.add(createFirefly(this.world, 1, 3));
    this.entities.add(createFirefly(this.world, 1, 4));
    this.entities.add(createFirefly(this.world, 1, 4));
    this.entities.add(createFirefly(this.world, 1, 4));
    this.entities.add(createFirefly(this.world, 1, 5));
    this.entities.add(createFirefly(this.world, 1, 5));
    this.entities.add(createFirefly(this.world, 1, 5));
    
    this.entities.add(createDestination(this.world, 10, 3));
    this.entities.add(createDestination(this.world, 3, 4));
    this.entities.add(createDestination(this.world, 3, 5));
    this.entities.add(createDestination(this.world, 14, 7));
    this.entities.add(createDestination(this.world, 10, 5));
    this.entities.add(createDestination(this.world, 16, 4));

    this.map = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0],
      [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // Set up pathfinding worker
    this.pathfindingWorker = new Worker(new URL('./pathfindingWorker.js', import.meta.url));
    this.pathfindingWorker.postMessage({
      grid: {
        height: Math.ceil(this.game.config.height / TILE_SIZE),
        width: Math.ceil(this.game.config.width / TILE_SIZE)
      },
      map: this.map
    });

    this.pathfindingWorker.onmessage = (event) => {
      const { entityId, path, pathType } = event.data;
      const entity = this.entities.entries().find(entity => entity[0].id === entityId)[0];
      this.applyPathToEntity(entity, path, pathType);
    };
    
    this.world.getSystem(DestinationSystem).setPathfindingWorker(this.pathfindingWorker);
  }

  applyPathToEntity(entity, path, pathType) {
    if (entity.hasComponent(PathComponent)) {
        let pathComp = entity.getMutableComponent(PathComponent)
        switch(pathType) {
            case 'current':
                pathComp.currentPath = path;
                break;
            case 'next':
                pathComp.nextPath = path;
                break;
            default:
                console.error('Invalid path type:', pathType);
                break;
        }
    }
  }

  update(time, delta) {
    this.world.execute(delta, time);
  }

  preload() {
    this.load.svg('firefly', 'assets/images/svg/circle.svg', { width: 10, height: 10});
  }
}
