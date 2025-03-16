import { System, Not} from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';

const TILE_SIZE = 32;

export default class DestinationSystem extends System {
  execute(delta, time) {
    // Get all entities that need a new destination (have velocity but empty path)
    this.queries.needsDestination.results.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const pathComp = entity.getMutableComponent(PathComponent);
      
      if (pathComp.path.length === 0) {
        // Find potential destinations (static entities to the right)
        let closestDestination = null;
        let closestDistance = Infinity;
        
        this.queries.potentialDestinations.results.forEach(destEntity => {
          const destPos = destEntity.getComponent(PositionComponent);
          
          // Check if destination is to the right of the entity
          if (destPos.x > position.x) {
            const distance = Math.hypot(destPos.x - position.x, destPos.y - position.y);

            if (distance < 1) { return } // Skip if destination is too close
            
            // Keep track of the closest destination
            if (distance < closestDistance) {
              closestDestination = destEntity;
              closestDistance = distance;
            }
          }
        });
        
        // If we found a destination, request a path to it
        if (closestDestination) {
          const destPos = closestDestination.getComponent(PositionComponent);
          
          // Create a grid for pathfinding (simplified - in real implementation this would use the actual game grid)
          const gridWidth = Math.ceil(800 / TILE_SIZE); // Assuming game width is 800
          const gridHeight = Math.ceil(600 / TILE_SIZE); // Assuming game height is 600
          const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
          
          // Request path from worker (assuming worker is accessible via scene)
          // In a real implementation, this would need to be handled differently
          // This is a placeholder to show the concept
          
          if (this.worker) {
            this.worker.postMessage({
              grid,
              entityId: entity.id,
              start: { 
                x: Math.floor(position.x / TILE_SIZE), 
                y: Math.floor(position.y / TILE_SIZE)
              }, 
              destination: { 
                x: Math.floor(destPos.x / TILE_SIZE),
                y: Math.floor(destPos.y / TILE_SIZE)
              } 
            });
          }
        }
      }
    });
  }
  
  // Method to set the pathfinding worker
  setPathfindingWorker(worker) {
    this.worker = worker;
  }
}

DestinationSystem.queries = {
  needsDestination: {
    components: [PositionComponent, VelocityComponent, PathComponent],
    listen: {
      changed: [PathComponent]
    }
  },
  potentialDestinations: {
    components: [PositionComponent, Not(VelocityComponent)]
  }
};
