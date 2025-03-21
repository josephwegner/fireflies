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
      .addComponent(PositionComponent, { x: 10, y: this.game.config.height * 0.25 })
      .addComponent(VelocityComponent, { vx: 1, vy: -1 })
      .addComponent(PathComponent, { path: [] });

    const fireflyTwo = this.world.createEntity()
      .addComponent(PositionComponent, { x: 10, y: this.game.config.height * 0.75 })
      .addComponent(VelocityComponent, { vx: 1, vy: -1 })
      .addComponent(PathComponent, { path: [] });

    const destinationOne = this.world.createEntity()
      .addComponent(PositionComponent, { x: this.game.config.width * .9, y: Math.ceil(this.game.config.height / 2) })
    const destinationTwo = this.world.createEntity()
        .addComponent(PositionComponent, { x: this.game.config.width * .3, y: Math.ceil(this.game.config.height / 3) })

    this.entities.add(fireflyOne);
    this.entities.add(fireflyTwo);
    this.entities.add(destinationOne);
    this.entities.add(destinationTwo);

    // Set up pathfinding worker
    this.pathfindingWorker = new Worker(new URL('./pathfindingWorker.js', import.meta.url));
    this.pathfindingWorker.postMessage({ grid: {
      height: this.game.config.height,
      width: this.game.config.width
    }});

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
    this.entities.forEach(entity => {
      if (entity.hasComponent(PositionComponent)) {
        const pos = entity.getComponent(PositionComponent);

        if (entity.hasComponent(PathComponent)) {
          this.graphics.fillStyle(0xffff00, 1);
          this.graphics.fillCircle(pos.x, pos.y, 5);
        } else {
          this.graphics.fillStyle(0x0000ff, 1);
          this.graphics.fillCircle(pos.x, pos.y, 5);
        }
      }
    });
  }
}
