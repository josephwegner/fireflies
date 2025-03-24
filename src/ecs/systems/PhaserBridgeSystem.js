import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import RenderableComponent from '../components/RenderableComponent';
import PhysicsBodyComponent from '../components/PhysicsBodyComponent';
import VelocityComponent from '../components/VelocityComponent';
import Entities from '../../entities';

export default class PhaserBridgeSystem extends System {
  constructor(world, attributes) {
    super(world, attributes);
    this.scene = attributes.scene;
    this.tileSize = attributes.tileSize;
  }
  
  execute() {
    // Handle creation of Phaser objects for new entities
    this.queries.renderableEntities.added.forEach(entity => {
      this.createPhaserObjects(entity);
    });
    
    // Handle updates to existing entities
    this.queries.renderableEntities.results.forEach(entity => {
      this.updatePhaserObjects(entity);
    });
    
    // Handle removal of Phaser objects for removed entities
    this.queries.renderableEntities.removed.forEach(entity => {
      this.removePhaserObjects(entity);
    });
  }
  
  createPhaserObjects(entity) {
    if(entity.hasComponent(PhysicsBodyComponent)) return;

    const position = entity.getComponent(PositionComponent);
    const renderable = entity.getComponent(RenderableComponent);
    
    let phaserObject = null;
    // Create appropriate Phaser object based on renderable type
    if (Entities[renderable.type]) {
      phaserObject = Entities[renderable.type].createPhaserEntity(entity, this.scene, this.tileSize);
    }

    phaserObject.ecsyEntity = entity;
    entity.addComponent(PhysicsBodyComponent, { body: phaserObject });
  }
  
  updatePhaserObjects(entity) {
    if (!entity.hasComponent(PhysicsBodyComponent)) return;
    
    const position = entity.getComponent(PositionComponent);
    const velocity = entity.getMutableComponent(VelocityComponent);
    const physicsBody = entity.getComponent(PhysicsBodyComponent).body;
    const renderable = entity.getComponent(RenderableComponent);
    
    // Update Phaser object position from ECS position
    physicsBody.setPosition(
      (position.x * this.tileSize) + this.tileSize - renderable.radius,
      (position.y * this.tileSize) + this.tileSize - renderable.radius
    );
    
    // Sync physics velocity back to ECS
    velocity.vx = physicsBody.body.velocity.x;
    velocity.vy = physicsBody.body.velocity.y;
  }
  
  removePhaserObjects(entity) {
    if (entity.hasComponent(PhysicsBodyComponent)) {
      const physicsBody = entity.getComponent(PhysicsBodyComponent).body;
      physicsBody.destroy();
    }
  }
}

PhaserBridgeSystem.queries = {
  renderableEntities: {
    components: [PositionComponent, VelocityComponent, RenderableComponent],
    listen: {
      added: true,
      removed: true
    }
  }
}; 