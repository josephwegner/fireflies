import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import DestinationComponent from '../ecs/components/DestinationComponent';
import PhysicsBodyComponent from '../ecs/components/PhysicsBodyComponent';
import EntityComponent from '../ecs/components/EntityComponent';
import Entity from '../entities/Entity.js';

export default class Wisp extends Entity {
  createECSYEntity(world, x, y) {
    const destination = world.createEntity()
      .addComponent(EntityComponent, { entity: this })
      .addComponent(PositionComponent, { x, y })
      .addComponent(DestinationComponent, { for: ['firefly'] })
      .addComponent(RenderableComponent, { type: 'wisp', color: 0xffffff, radius: 12 })
      .addComponent(TypeComponent, { type: 'wisp' })
      .addComponent(PhysicsBodyComponent)
  
    return destination;
  }
  
  customizeSprite(sprite) {
    const renderable = sprite.ecsyEntity.getComponent(RenderableComponent);
    sprite.setDisplaySize(renderable.radius * 2, renderable.radius * 2);
    sprite.setCircle(sprite.width / 2);
    sprite.rotationSpeed = 0.01;
  }
}