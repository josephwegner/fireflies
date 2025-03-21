import Phaser from 'phaser';
import { World } from 'ecsy';
import PositionComponent from './ecs/components/PositionComponent';
import VelocityComponent from './ecs/components/VelocityComponent';
import PathComponent from './ecs/components/PathComponent';
import MovementSystem from './ecs/systems/MovementSystem';
import DestinationSystem from './ecs/systems/DestinationSystem';

const TILE_SIZE = 32;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.entities = new Set(); // Track entities manually
  }

  create() {
    this.world = new World();

    this.world
      .registerComponent(PositionComponent)
      .registerComponent(VelocityComponent)
      .registerComponent(PathComponent)
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem);

    // Create a test firefly entity
    const fireflyOne = this.world.createEntity()
      .addComponent(PositionComponent, { x: 0, y: 1 })
      .addComponent(VelocityComponent, { vx: 0, vy: 0 })
      .addComponent(PathComponent, { path: [] });

    const fireflyTwo = this.world.createEntity()
      .addComponent(PositionComponent, { x: 0, y: 5 })
      .addComponent(VelocityComponent, { vx: 0, vy: 0 })
      .addComponent(PathComponent, { path: [] });

    const destinationOne = this.world.createEntity()
      .addComponent(PositionComponent, { x: 9, y: 3 })
    const destinationTwo = this.world.createEntity()
      .addComponent(PositionComponent, { x: 3, y: 2 })
    const destinationThree = this.world.createEntity()
      .addComponent(PositionComponent, { x: 3, y: 5 })

    this.map = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [0, 1, 0, 1, 1, 1, 0, 0, 0, 0],
      [1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]

    this.entities.add(fireflyOne);
    this.entities.add(fireflyTwo);
    this.entities.add(destinationOne);
    this.entities.add(destinationTwo);
    this.entities.add(destinationThree);

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

    // Phaser graphics for rendering
    this.graphics = this.add.graphics();
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

    this.graphics.clear();
    
    if(this.map) {
      this.map.forEach((row, y) => {
        row.forEach((tile, x) => {
          this.graphics.fillStyle(tile === 1 ? 0x00ff00 : 0x000000, 1);
          this.graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });
      });
    }
    
    // Draw entities
    this.entities.forEach(entity => {
      if (entity.hasComponent(PositionComponent)) {
        const pos = entity.getComponent(PositionComponent);

        if (entity.hasComponent(PathComponent)) {
          this.graphics.fillStyle(0xff0000, 1);
          this.graphics.fillCircle((pos.x * TILE_SIZE) + (TILE_SIZE / 2), (pos.y * TILE_SIZE) + (TILE_SIZE / 2), 5);
        } else {
          this.graphics.fillStyle(0x0000ff, 1);
          this.graphics.fillCircle((pos.x * TILE_SIZE) + (TILE_SIZE / 2), (pos.y * TILE_SIZE) + (TILE_SIZE / 2), 5);
        }
      }
    });
  }
}
