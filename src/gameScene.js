import Phaser from 'phaser';
import { World } from 'ecsy';
import PositionComponent from './ecs/components/PositionComponent';
import VelocityComponent from './ecs/components/VelocityComponent';
import PathComponent from './ecs/components/PathComponent';
import MovementSystem from './ecs/systems/MovementSystem';

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
      .registerSystem(MovementSystem);

    // Create a test firefly entity
    const fireflyOne = this.world.createEntity()
      .addComponent(PositionComponent, { x: 10, y: this.game.config.height * 0.25 })
      .addComponent(VelocityComponent, { vx: 1, vy: -1 })
      .addComponent(PathComponent, { path: [] });

    const fireflyTwo = this.world.createEntity()
      .addComponent(PositionComponent, { x: 10, y: this.game.config.height * 0.75 })
      .addComponent(VelocityComponent, { vx: 1, vy: -1 })
      .addComponent(PathComponent, { path: [] });

    this.entities.add(fireflyOne);
    this.entities.add(fireflyTwo);

    // Set up pathfinding worker
    this.pathfindingWorker = new Worker(new URL('./pathfindingWorker.js', import.meta.url));
    this.pathfindingWorker.onmessage = (event) => {
      const { entityId, path } = event.data;
      this.applyPathToEntity(this.entities.entries().find(entity => entity[0].id === entityId)[0], path);
    };

    // Request a test path from the worker
    const gridWidth = Math.ceil(this.game.config.width / TILE_SIZE);
    const gridHeight = Math.ceil(this.game.config.height / TILE_SIZE);
    
    // Create a grid of walkable tiles (all 0s)
    const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
    this.pathfindingWorker.postMessage({ grid, entityId: fireflyOne.id, start: { x: Math.floor(fireflyOne.getComponent(PositionComponent).x / TILE_SIZE), y: Math.floor(fireflyOne.getComponent(PositionComponent).y / TILE_SIZE) }, destination: { x: gridWidth - 1, y: Math.ceil(gridHeight / 2) } });
    this.pathfindingWorker.postMessage({ grid, entityId: fireflyTwo.id, start: { x: Math.floor(fireflyTwo.getComponent(PositionComponent).x / TILE_SIZE), y: Math.floor(fireflyTwo.getComponent(PositionComponent).y / TILE_SIZE) }, destination: { x: gridWidth - 1, y: Math.ceil(gridHeight / 2) } });

    // Phaser graphics for rendering
    this.graphics = this.add.graphics();
  }

  applyPathToEntity(entity, path) {
    if (entity.hasComponent(PathComponent)) {
    entity.getMutableComponent(PathComponent).path = path;
    }
  }

  update(time, delta) {
    this.world.execute(delta, time);

    this.graphics.clear();
    this.entities.forEach(entity => {
      if (entity.hasComponent(PositionComponent)) {
        const pos = entity.getComponent(PositionComponent);
        this.graphics.fillStyle(0xffff00, 1);
        this.graphics.fillCircle(pos.x, pos.y, 5);
      }
    });
  }
}
