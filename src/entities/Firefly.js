import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import VelocityComponent from '../ecs/components/VelocityComponent';
import PathComponent from '../ecs/components/PathComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import PhysicsBodyComponent from '../ecs/components/PhysicsBodyComponent';

export default {
  createECSYEntity(world, x, y) {
    const JITTER = 0.3;
    const firefly = world.createEntity()
      .addComponent(PositionComponent, { x: x + Math.random() * JITTER, y: y + Math.random() * JITTER })
      .addComponent(VelocityComponent, { vx: 0, vy: 0 })
      .addComponent(PathComponent, { currentPath: [], nextPath: [] })
      .addComponent(RenderableComponent, { type: 'firefly', color: 0xffffff, radius: 5 })
      .addComponent(TypeComponent, { type: 'firefly' })
      .addComponent(PhysicsBodyComponent);
    
    return firefly;
  },

  customizeSprite(sprite) {
    sprite.setDisplaySize(10, 10);
  }
}