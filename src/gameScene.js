import Phaser from 'phaser';
import { World } from 'ecsy';
import PositionComponent from './ecs/components/PositionComponent';
import VelocityComponent from './ecs/components/VelocityComponent';
import PathComponent from './ecs/components/PathComponent';
import RenderableComponent from './ecs/components/RenderableComponent';
import NavMeshComponent from './ecs/components/NavMeshComponent';
import WallComponent from './ecs/components/WallComponent';
import MovementSystem from './ecs/systems/MovementSystem';
import DestinationSystem from './ecs/systems/DestinationSystem';
import RenderSystem from './ecs/systems/RenderSystem';
import WallGenerationSystem from './ecs/systems/WallGenerationSystem';
import PhysicsSystem from './ecs/systems/PhysicsSystem';
import PhysicsBodyComponent from './ecs/components/PhysicsBodyComponent';
import TypeComponent from './ecs/components/TypeComponent';
import InteractionComponent from './ecs/components/InteractionComponent';
import PhaserBridgeSystem from './ecs/systems/PhaserBridgeSystem';
import DestinationComponent from './ecs/components/DestinationComponent.js';
import NavMeshSystem from './ecs/systems/NavMeshSystem';
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
    this.world.scene = this
    this.pathfindingWorker = new Worker(new URL('./pathfindingWorker.js', import.meta.url));

    this.world
      .registerComponent(PositionComponent)
      .registerComponent(VelocityComponent)
      .registerComponent(DestinationComponent)
      .registerComponent(PathComponent)
      .registerComponent(RenderableComponent)
      .registerComponent(WallComponent)
      .registerComponent(PhysicsBodyComponent)
      .registerComponent(TypeComponent)
      .registerComponent(InteractionComponent)
      .registerComponent(NavMeshComponent)
      .registerSystem(WallGenerationSystem)
      .registerSystem(MovementSystem)
      .registerSystem(DestinationSystem)
      .registerSystem(RenderSystem, { tileSize: TILE_SIZE })
      .registerSystem(PhysicsSystem, { physics: this.physics, tileSize: this.tileSize})
      .registerSystem(PhaserBridgeSystem, { 
        scene: this, 
        tileSize: this.tileSize
      });

    if (this.game.fireflies_debug) {
      this.world.registerSystem(DebugSystem, { tileSize: TILE_SIZE })
    }

    // Create initial entities
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 3));
    /*this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 3));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 3));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 4));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 4));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 4));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 5));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 5));
    this.entities.add(Entities.firefly.createECSYEntity(this.world, 1, 5));*/
    
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 10, 3));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 2, 4));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 3, 5));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 11, 6));
    this.entities.add(Entities.wisp.createECSYEntity(this.world, 9, 5));

    this.entities.add(Entities.monster.createECSYEntity(this.world, 17, 4))
    
    this.entities.add(Entities.goal.createECSYEntity(this.world, 16, 4, 'firefly'));
    this.entities.add(Entities.goal.createECSYEntity(this.world, 1, 4, 'monster'))

    this.map = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0],
      [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    this.world.registerSystem(NavMeshSystem, { map: this.map })

    // Listen for messages from the worker
    this.pathfindingWorker.onmessage = (e) => {
      if (e.data.error) {
        console.error('Failed to load NavMesh in worker:', e.data.error);
      } else if (e.data.type === 'navmesh_loaded') {
        if (e.data.success) {
          console.log('NavMesh successfully loaded in worker');
        } else {
          console.error('Failed to load NavMesh in worker:', e.data.error);
        }
      } else if (e.data.entityId) {
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
    this.load.svg('firefly', 'assets/images/svg/firefly.svg', { width: 10, height: 10});
    this.load.svg('goal', 'assets/images/svg/firefly.svg', { width: 20, height: 20});
    this.load.image('wisp', 'assets/images/png/wisp.png');
    this.load.image('monster', 'assets/images/png/monster.png');
  }
}
