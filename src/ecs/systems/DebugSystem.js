import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import RenderableComponent from '../components/RenderableComponent';
import PathComponent from '../components/PathComponent';
import VelocityComponent from '../components/VelocityComponent';
import { COLORS } from '../../constants/colors';
import NavMeshSystem from './NavMeshSystem';
import NavMeshComponent from '../components/NavMeshComponent';
export default class DebugSystem extends System {
  constructor(world, attributes) {
    super(world, attributes);
    this.scene = this.world.scene
    this.tileSize = attributes.tileSize
  } 

  execute() {
    if (!this.scene.graphics) {
      return
    }

    //this.drawGrid();
    this.renderPaths();
    this.renderNavMesh();
  }

  renderNavMesh() {
    if(
      !this.queries.navMesh.results.length > 0 || 
      !this.queries.navMesh.results[0].getComponent(NavMeshComponent).polygons) { 
        return
      }

    this.queries.navMesh.results[0].getComponent(NavMeshComponent).polygons.forEach(polygon => {
      this.scene.graphics.fillStyle(COLORS.GREEN, 0.3);
      this.scene.graphics.beginPath();
      this.scene.graphics.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i++) {
        this.scene.graphics.lineTo(polygon[i].x, polygon[i].y);
      }
      this.scene.graphics.closePath();
      this.scene.graphics.fillPath();
    })
  }

  drawGrid() {
    const width = this.scene.game.config.width;
    const height = this.scene.game.config.height;
    
    // Draw filled squares for each tile
    for (let y = 0; y < height; y += this.tileSize) {
      for (let x = 0; x < width; x += this.tileSize) {
        const gridX = x / this.tileSize;
        const gridY = y / this.tileSize;
        
        // Check if tile is passable (0) or not (1)
        const isPassable = this.scene.map[gridY]?.[gridX] === 0;
        
        // Draw filled rectangle
        this.scene.graphics.fillStyle(isPassable ? COLORS.RED : COLORS.GREEN, 0.2);
        this.scene.graphics.fillRect(x, y, this.tileSize, this.tileSize);
        
        // Add grid coordinates
        if (gridX === 0 || gridY === 0) {
        this.scene.add.text(x + 2, y + 2, `${gridX},${gridY}`, {
          fontSize: '12px',
            fill: COLORS.WHITE
          });
        }
      }
    }
  }

  renderPaths() {
    if (!this.scene.graphics) {
      return
    }

    this.queries.paths.results.forEach(entity => {
      const path = entity.getComponent(PathComponent)
      const position = entity.getComponent(PositionComponent)
      
      if (path && path.currentPath && path.currentPath.length > 0) {
        this.scene.graphics.lineStyle(1, COLORS.GREEN , 1);

        this.scene.graphics.beginPath();
        this.scene.graphics.moveTo(position.x, position.y);
        this.scene.graphics.lineTo(path.currentPath[0].x, path.currentPath[0].y);
        this.scene.graphics.strokePath();
        this.scene.graphics.closePath();
      }
    })
  }
} 

DebugSystem.queries = {
  paths: { components: [PositionComponent, PathComponent, RenderableComponent] },
  velocities: { components: [PositionComponent, VelocityComponent] },
  navMesh: { components: [NavMeshComponent] }
}