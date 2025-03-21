import { System, Not} from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';

export default class DestinationSystem extends System {
  execute(delta, time) {
    // Get all entities that need a new destination (have velocity but empty path)
    this.queries.needsDestination.results.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const pathComp = entity.getMutableComponent(PathComponent);

      if (pathComp.currentPath === null) {
        return // Can't calculate anything without a current path!
      }

      if(!pathComp.currentPath.length) {
        const leftMax = {
          x: position.x,
          y: position.y
        }
        const destinations = this.gatherRightwardDestinations(leftMax)

        if (destinations.length) {
          this.requestPath(entity, {
            x: position.x,
            y: position.y
          }, {
            x: destinations[0].pos.x,
            y: destinations[0].pos.y
          }, 'current')
        } else {
          pathComp.currentPath = null; // Signal no more paths
        }
      } else if (pathComp.nextPath !== null && !pathComp.nextPath.length) {
        const lastPos = pathComp.currentPath[pathComp.currentPath.length - 1]
        const leftMax = {
          x: lastPos.x,
          y: lastPos.y
        }
        const destinations = this.gatherRightwardDestinations(leftMax)

        if (destinations.length) {
          this.requestPath(entity, {
            x: lastPos.x,
            y: lastPos.y
          }, {
            x: destinations[0].pos.x,
            y: destinations[0].pos.y
          }, 'next')
        } else {
          pathComp.nextPath = null; // Signal no more paths
        }
      }
    });
  }

  gatherRightwardDestinations(leftMax) {
    const rightwardDestinations = [];
    
    this.queries.potentialDestinations.results.forEach(destEntity => {
      const destPos = destEntity.getComponent(PositionComponent);
      
      // Check if destination is to the right of the entity
      if (destPos.x > leftMax.x) {
        console.log(leftMax.x, destPos.x);
        // Skip if destination is too close
        if (Math.hypot(destPos.x - leftMax.x, destPos.y - leftMax.y) < 1) return;
        
        rightwardDestinations.push({
          entity: destEntity,
          pos: destPos,
          x: destPos.x // Store x value for sorting
        });
      }
    });
    
    // Sort destinations by x value ascending
    rightwardDestinations.sort((a, b) => a.x - b.x);
    
    return rightwardDestinations;
  }

  requestPath(entity, start, destination, pathType) {
    if(!this.worker) {
      console.error('No pathfinding worker set');
      return;
    }

    const entityPosition = entity.getComponent(PositionComponent);

    this.worker.postMessage({
      entityId: entity.id,
      pathType: pathType,
      start: { 
        x: Math.floor(start.x), 
        y: Math.floor(start.y)
      },
      destination: {
        x: Math.floor(destination.x),
        y: Math.floor(destination.y)
      }
  })
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
