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
      .registerSystem(PhysicsSystem, { physics: this.physics, tileSize: this.tileSize});

    // Create initial entities
    this.createFirefly(0, 1);
    this.createFirefly(1, 1);
    this.createFirefly(2, 1);
    this.createFirefly(3, 1);
    this.createFirefly(4, 1);
    this.createFirefly(0, 5);
    this.createFirefly(1, 5);
    this.createFirefly(1, 4);
    this.createFirefly(1, 3);
    
    this.createDestination(9, 3);
    this.createDestination(3, 2);
    this.createDestination(3, 5);
    
    this.map = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [0, 1, 0, 1, 1, 1, 0, 0, 0, 0],
      [1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]

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

  createFirefly(x, y, color = 0xff0000, radius = 5) {
    const firefly = this.world.createEntity()
      .addComponent(PositionComponent, { x, y})
      .addComponent(VelocityComponent, { vx: 0, vy: 0 })
      .addComponent(PathComponent, { path: [] })
      .addComponent(RenderableComponent, { type: 'firefly', color, radius })
      .addComponent(TypeComponent, { type: 'firefly' })
    
    this.entities.add(firefly);
    return firefly;
  }

  createDestination(x, y, color = 0x0000ff, radius = 5) {
    const destination = this.world.createEntity()
      .addComponent(PositionComponent, { x, y })
      .addComponent(RenderableComponent, { type: 'wisp', color, radius });
    
    this.entities.add(destination);
    return destination;
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
}
