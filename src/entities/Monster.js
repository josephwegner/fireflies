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
      .addComponent(PathComponent, { path: [] })
      .addComponent(RenderableComponent, { type: 'monster', color: 0xffffff, radius: 9.25 })
      .addComponent(TypeComponent, { type: 'monster' })
      .addComponent(PhysicsBodyComponent)
    
    return monster;
  },

  createPhaserEntity(entity, world) {
    const position = entity.getComponent(PositionComponent);
    const renderable = entity.getComponent(RenderableComponent);

    const sprite = world.physics.add.sprite(position.x, position.y, 'monster');
    
    const actualRadius = renderable.radius * 1.5;
    sprite.setDisplayOrigin(actualRadius, actualRadius);
    sprite.setCircle(actualRadius);
    sprite.setAlpha(0);

    // Set a small drag to prevent perpetual bouncing
    sprite.setDamping(true);
    sprite.setDrag(0.05);

    return sprite;
  },

  customizeSprite(sprite) {
    sprite.setDisplaySize(18.5, 18.5);
  }
}