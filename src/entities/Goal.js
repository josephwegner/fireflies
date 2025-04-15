import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import DestinationComponent from '../ecs/components/DestinationComponent';
import PhysicsBodyComponent from '../ecs/components/PhysicsBodyComponent';
export default {
  createECSYEntity(world, x, y, attractType) {
    let goal = world.createEntity()
      .addComponent(PositionComponent, { x, y } )
      .addComponent(TypeComponent, { type: 'goal' })
      .addComponent(DestinationComponent, { for: [attractType] })
      .addComponent(RenderableComponent, { type: 'goal', color: 0x00ff00, radius: 10 })
      .addComponent(PhysicsBodyComponent);
    return goal;
  },

  customizeSprite(sprite) {
    const renderable = sprite.ecsyEntity.getComponent(RenderableComponent);
    sprite.setDisplaySize(renderable.radius * 2, renderable.radius * 2);
    sprite.setCircle(sprite.width / 2);
  }
}