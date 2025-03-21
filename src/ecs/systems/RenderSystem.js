import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import RenderableComponent from '../components/RenderableComponent';

export default class RenderSystem extends System {
  constructor(attributes) {
    super(attributes);
    this.scene = this.world.scene
    this.graphics = this.scene.add.graphics()
    this.tileSize = 32;
  } 

  execute() {
    this.graphics.clear();
    
    // Render map tiles
    this.renderMap();
    
    // Render entities
    this.renderEntities();
  }

  renderMap() {
    const map = this.scene.map;
    if (!map) return;
    
    map.forEach((row, y) => {
      row.forEach((tile, x) => {
        this.graphics.fillStyle(tile === 1 ? 0x00ff00 : 0x000000, 1);
        this.graphics.fillRect(
          x * this.tileSize, 
          y * this.tileSize, 
          this.tileSize, 
          this.tileSize
        );
      });
    });
  }

  renderEntities() {
    // Query for entities with both Position and Renderable components
    this.queries.renderables.results.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const renderable = entity.getComponent(RenderableComponent);
      
      this.graphics.fillStyle(renderable.color, 1);
      this.graphics.fillCircle(
        (position.x * this.tileSize) + (this.tileSize / 2),
        (position.y * this.tileSize) + (this.tileSize / 2),
        renderable.radius
      );
    });
  }
} 

RenderSystem.queries = {
    renderables: { components: [PositionComponent, RenderableComponent] }
}