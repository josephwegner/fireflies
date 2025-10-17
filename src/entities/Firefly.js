import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import VelocityComponent from '../ecs/components/VelocityComponent';
import PathComponent from '../ecs/components/PathComponent';
import TypeComponent from '../ecs/components/TypeComponent';
import PhysicsBodyComponent from '../ecs/components/PhysicsBodyComponent';
import TargetingComponent from '../ecs/components/TargetingComponent';
import InteractionComponent from '../ecs/components/InteractionComponent';
import EntityComponent from '../ecs/components/EntityComponent';
import Entity from '../entities/Entity.js';

export default class Firefly extends Entity {
  createECSYEntity(world, x, y) {
    const JITTER = 0.3;
    const firefly = world.createEntity()
      .addComponent(EntityComponent, { entity: this })
      .addComponent(PositionComponent, { x: x + Math.random() * JITTER, y: y + Math.random() * JITTER })
      .addComponent(VelocityComponent, { vx: 0, vy: 0 })
      .addComponent(PathComponent)
      .addComponent(RenderableComponent, { type: 'firefly', color: 0xffffff, radius: 5 })
      .addComponent(TypeComponent, { type: 'firefly' })
      .addComponent(PhysicsBodyComponent)
      .addComponent(InteractionComponent, {
        interactsWith: ['monster'],
        interactionRadius: 30
      })
      .addComponent(TargetingComponent);
    
    return firefly;
  }

  customizeSprite(sprite) {
    const renderable = sprite.ecsyEntity.getComponent(RenderableComponent);
    sprite.setDisplaySize(renderable.radius * 2, renderable.radius * 2);
    sprite.setCircle(sprite.width / 2);
  }
}
