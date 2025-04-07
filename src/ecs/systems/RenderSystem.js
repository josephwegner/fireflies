import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import RenderableComponent from '../components/RenderableComponent';
import WallComponent from '../components/WallComponent';
import TypeComponent from '../components/TypeComponent';
import Entities from '../../entities/index.js'
import PathComponent from '../components/PathComponent';

export default class RenderSystem extends System {
  constructor(world, attributes) {
    super(world, attributes);
    this.scene = this.world.scene
    this.graphics = this.scene.add.graphics()
    this.scene.graphics = this.graphics
  } 

  execute() {
    this.graphics.clear();
    
    // Render walls
    this.renderWalls();
    
    // Render entities
    this.renderEntities();
  }

  renderWalls() {
    // Query for entities with WallComponent
    this.queries.walls.results.forEach(entity => {
      const wall = entity.getComponent(WallComponent);
      this.graphics.lineStyle(wall.thickness, wall.color, 1);
      
      wall.segments.forEach(segment => {
        if (Array.isArray(segment)) {
          // Draw a smooth path
          if (segment.length < 2) return;
          
          this.graphics.beginPath();
          this.graphics.moveTo(segment[0].x, segment[0].y);
          
          for (let i = 1; i < segment.length; i++) {
            this.graphics.lineTo(segment[i].x, segment[i].y);
          }
          
          this.graphics.strokePath();
        }
      });
    });
  }

  renderEntities() {
    this.queries.renderables.added.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const renderable = entity.getComponent(RenderableComponent);
      const type = entity.getComponent(TypeComponent).type;

      renderable.sprite = this.scene.add.sprite(
        position.x,
        position.y,
        type);

      if (renderable.color) {
        renderable.sprite.setTint(renderable.color)
      }

      if (Entities[type].customizeSprite) {
        Entities[type].customizeSprite(renderable.sprite)
      }
    })

    this.queries.renderables.removed.forEach(entity => {
      const renderable = entity.getComponent(RenderableComponent);
      renderable.sprite.destroy();
      this.scene.remove(renderable.sprite);
    })

    this.queries.renderables.changed.forEach(entity => {
      const renderable = entity.getComponent(RenderableComponent);
      const position = entity.getComponent(PositionComponent);
      renderable.sprite.setPosition(position.x, position.y);
    })

    this.queries.renderables.results.forEach(entity => {
      const renderable = entity.getComponent(RenderableComponent);
      if (renderable.sprite.rotationSpeed) {
        renderable.sprite.rotation += renderable.sprite.rotationSpeed;
      }
    })
  }
} 

RenderSystem.queries = {
  renderables: {
    components: [PositionComponent, RenderableComponent],
    listen: {
      added: true,
      removed: true,
      changed: [ PositionComponent ]
    }
  },
  walls: { components: [WallComponent] }
}