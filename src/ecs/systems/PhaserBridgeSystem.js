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
    // Handle updates to existing entities
    this.queries.renderableEntities.results.forEach(entity => {
      this.updatePhaserObjects(entity);
    });
  }
  
  updatePhaserObjects(entity) {
    if (!entity.hasComponent(PhysicsBodyComponent)) return;
    
    const position = entity.getComponent(PositionComponent);
    const velocity = entity.getMutableComponent(VelocityComponent);
    const physicsBody = entity.getComponent(PhysicsBodyComponent);
    const renderable = entity.getComponent(RenderableComponent);
    
    // Always position at tile center
    const newX = (position.x * this.tileSize) + (this.tileSize / 2) + (renderable.radius * 2);
    const newY = (position.y * this.tileSize) + (this.tileSize / 2) + (renderable.radius * 2);

    if (physicsBody.body) { 
      physicsBody.body.setPosition(newX, newY); 
    }

    physicsBody.colliders.forEach(body => {
      body.setPosition(newX, newY)
    })
    
    // Sync physics velocity back to ECS
    if (velocity && physicsBody.body) {
      velocity.vx = physicsBody.body.body.velocity.x;
      velocity.vy = physicsBody.body.body.velocity.y;
    }
  }
}

PhaserBridgeSystem.queries = {
  renderableEntities: {
    components: [PositionComponent, RenderableComponent],
    listen: {
      added: true,
      removed: true
    }
  }
}; 