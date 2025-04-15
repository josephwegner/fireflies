import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import VelocityComponent from '../ecs/components/VelocityComponent';
import PathComponent from '../ecs/components/PathComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import PhysicsBodyComponent from '../ecs/components/PhysicsBodyComponent';

export default {
  createECSYEntity(world, x, y) {
    const JITTER = 0.3;
    const monster = world.createEntity()
      .addComponent(PositionComponent, { x: x + Math.random() * JITTER, y: y + Math.random() * JITTER })
      .addComponent(VelocityComponent, { vx: 0, vy: 0 })
      .addComponent(PathComponent)
      .addComponent(RenderableComponent, { type: 'monster', color: 0xffffff, radius: 8 })
      .addComponent(TypeComponent, { type: 'monster' })
      .addComponent(PhysicsBodyComponent)
    
    return monster;
  },

  customizeSprite(sprite) {
    const renderable = sprite.ecsyEntity.getComponent(RenderableComponent);
    sprite.setDisplaySize(renderable.radius * 2, renderable.radius * 2);
    sprite.setCircle(sprite.width / 2);
  }
}