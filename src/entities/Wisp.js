import PositionComponent from '../ecs/components/PositionComponent';
import RenderableComponent from '../ecs/components/RenderableComponent';
import TypeComponent from '../ecs/components/TypeComponent';
export default {
  createECSYEntity(world, x, y) {
    const destination = world.createEntity()
    .addComponent(PositionComponent, { x, y })
    .addComponent(RenderableComponent, { type: 'wisp', color: 0xffffff, radius: 24 })
    .addComponent(TypeComponent, { type: 'wisp' })
  
    return destination;
  },

  createPhaserEntity(entity, world) {
    // Create Phaser sprite for wisp
    const sprite = world.scene.physics.add.sprite(
      (position.x * world.tileSize) + world.tileSize/2,
      (position.y * world.tileSize) + world.tileSize/2,
      'wisp'
    );

    sprite.setAlpha(0);

    return sprite;
  }
}