import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import DestinationComponent from '../ecs/components/DestinationComponent';

export default {
  createECSYEntity(world, x, y, attractType) {
    let goal = world.createEntity()
      .addComponent(PositionComponent, { x: x, y: y} )
      .addComponent(TypeComponent, { type: 'goal' })
      .addComponent(DestinationComponent, { for: [attractType] })
      .addComponent(RenderableComponent, { type: 'goal', color: 0x00ff00, radius: 10 })
    
    return goal;
  },

  createPhaserEntity(entity, world) {
    const position = entity.getComponent(PositionComponent);
    const renderable = entity.getComponent(RenderableComponent);

    const sprite = world.physics.add.sprite(
      (position.x * world.tileSize) + world.tileSize/2,
      (position.y * world.tileSize) + world.tileSize/2,
      'goal'
    );
    
    sprite.setDisplayOrigin(renderable.radius * 2.375, renderable.radius * 2.375);
    sprite.setCircle(renderable.radius);
    sprite.setAlpha(0);

    return sprite;
  }
}