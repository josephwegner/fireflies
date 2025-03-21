import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import RenderableComponent from '../components/RenderableComponent';
import WallComponent from '../components/WallComponent';

export default class RenderSystem extends System {
  constructor(attributes) {
    super(attributes);
    this.scene = this.world.scene
    this.graphics = this.scene.add.graphics()
    this.tileSize = 32;
  } 

  execute() {
    this.graphics.clear();
    
    // Render walls
    this.renderWalls();
    
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
    renderables: { components: [PositionComponent, RenderableComponent] },
    walls: { components: [WallComponent] }
}