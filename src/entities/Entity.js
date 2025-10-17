import EntityComponent from '../ecs/components/EntityComponent';
import PositionComponent from '../ecs/components/PositionComponent';
import TypeComponent from '../ecs/components/TypeComponent';

export default class Entity {
  constructor(world, x, y) {
    this.ecsyEntity = this.createECSYEntity(world, x, y)
  }

  createECSYEntity(world, x, y) {
    return world.createEntity()
      .addComponent(EntityComponent, { entity: this })
      .addComponent(PositionComponent, { x, y })
      .addComponent(TypeComponent, { type: 'entity' })
  }

  customizeSprite(sprite) {
    // Override in subclasses
  }
}