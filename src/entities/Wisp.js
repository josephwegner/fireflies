import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import DestinationComponent from '../ecs/components/DestinationComponent';
import PhysicsBodyComponent from '../ecs/components/PhysicsBodyComponent';

export default {
  createECSYEntity(world, x, y) {
    const destination = world.createEntity()
    .addComponent(PositionComponent, { x, y })
    .addComponent(DestinationComponent, { for: ['firefly'] })
    .addComponent(RenderableComponent, { type: 'wisp', color: 0xffffff, radius: 24 })
    .addComponent(TypeComponent, { type: 'wisp' })
    .addComponent(PhysicsBodyComponent)
  
    return destination;
  },
  
  customizeSprite(sprite) {
    sprite.setDisplaySize(24, 24);
    sprite.rotationSpeed = 0.01;
  }
}