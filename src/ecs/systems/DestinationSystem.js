import { System, Not} from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';

export default class DestinationSystem extends System {
  constructor(world) {
    super(world)

    world.scene.pathfindingWorker.onmessage = (event) => {
      const { entityId, path, pathType } = event.data;
      const entity = this.world.scene.entities.entries().find(entity => entity[0].id === entityId)[0];
      this.applyPathToEntity(entity, path, pathType);
    };
    
    this.worker = world.scene.pathfindingWorker
  }

  init() {
  }

  execute(delta, time) {
    // Get all entities that need a new destination (have velocity but empty path)
    this.queries.needsDestination.results.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const pathComp = entity.getMutableComponent(PathComponent);

      if (pathComp.currentPath === null) {
        return // Can't calculate anything without a current path!
      }

      // Find the final destination (rightmost static entity)
      const finalDestination = this.findFinalDestination();

      if(!pathComp.currentPath.length) {
        const currentPos = {
          x: position.x,
          y: position.y
        }
        
        if (finalDestination) {
          const destinations = this.gatherDestinations(currentPos, finalDestination);

          if (destinations.length) {
            this.requestPath(entity, currentPos, {
              x: destinations[0].pos.x,
              y: destinations[0].pos.y
            }, 'current')
          } else {
            pathComp.currentPath = null; // Signal no more paths
          }
        }
      } else if (pathComp.nextPath !== null && !pathComp.nextPath.length) {
        const lastPos = pathComp.currentPath[pathComp.currentPath.length - 1]
        
        if (finalDestination) {
          const destinations = this.gatherDestinations(lastPos, finalDestination);
          if (destinations.length) {
            this.requestPath(entity, lastPos, {
              x: destinations[0].pos.x,
              y: destinations[0].pos.y
            }, 'next')
          } else {
            pathComp.nextPath = null; // Signal no more paths
          }
        }
      }
    });
  }



  applyPathToEntity(entity, path, pathType) {
    if (entity.hasComponent(PathComponent)) {
        let pathComp = entity.getMutableComponent(PathComponent)
        switch(pathType) {
            case 'current':
                pathComp.currentPath = path;
                break;
            case 'next':
                pathComp.nextPath = path;
                break;
            default:
                console.error('Invalid path type:', pathType);
                break;
        }
    }
  }

  findFinalDestination() {
    let rightmostEntity = null;
    let maxX = -Infinity;
    
    this.queries.potentialDestinations.results.forEach(entity => {
      const pos = entity.getComponent(PositionComponent);
      if (pos.x > maxX) {
        maxX = pos.x;
        rightmostEntity = {
          entity: entity,
          pos: pos
        };
      }
    });
    
    return rightmostEntity;
  }

  gatherDestinations(current, finalDest, minScoreThreshold = 1.0) {
    // Compute the ideal direction vector from current to final destination)
    const idealDX = finalDest.pos.x - current.x;
    const idealDY = finalDest.pos.y - current.y;
    const idealDist = Math.hypot(idealDX, idealDY);
    
    // If the final destination is too close, just return it
    if (idealDist < 1) return [];
    
    const mainDir = { 
      x: idealDX / idealDist, 
      y: idealDY / idealDist 
    };

    const candidates = [];
    
    this.queries.potentialDestinations.results.forEach(entity => {
      const destPos = entity.getComponent(PositionComponent);
      
      // Skip if destination is too close
      const distToDest = Math.hypot(destPos.x - current.x, destPos.y - current.y);
      if (distToDest < 1) return;
      
      // Vector from current to candidate
      const vx = destPos.x - current.x;
      const vy = destPos.y - current.y;
      const progress = vx * mainDir.x + vy * mainDir.y;  // projection length along the ideal path

      // Only consider destinations that are in the forward direction
      if (progress <= 0) return;
      
      // Calculate the point on the direct path that's closest to this entity
      const projPoint = { 
        x: current.x + progress * mainDir.x, 
        y: current.y + progress * mainDir.y 
      };
      
      // Distance from the entity to the direct path
      const distanceFromPath = Math.hypot(destPos.x - projPoint.x, destPos.y - projPoint.y);
      
      // Progress as a percentage of total distance to final destination
      const progressPercent = progress / idealDist;
      
      // Score is higher when:
      // 1. The entity is close to the direct path (small distanceFromPath)
      // 2. The entity makes reasonable progress toward the final destination
      const pathProximityFactor = 1 / (distanceFromPath + 0.5);
      
      // Balance between path proximity and progress
      // Higher pathWeight values favor entities closer to the path
      const PATH_WEIGHT = 3
      const PROGRESS_WEIGHT = .1
      let score = 
        (progressPercent * PROGRESS_WEIGHT) +
        (pathProximityFactor * PATH_WEIGHT);

      if (destPos.x === finalDest.pos.x && destPos.y === finalDest.pos.y) {
        // Don't choose the final destination as a destination unless everything else sucks
        score = minScoreThreshold
      }

      if (score >= minScoreThreshold) {
        candidates.push({
          entity: entity,
          pos: destPos,
          score: score,
          // Debug info
          pathProximityFactor: pathProximityFactor,
          progressPercent: progressPercent
        });
      }
    });
    
    // Sort candidates by score in descending order
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
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
        x: Math.round(start.x), 
        y: Math.round(start.y)
      },
      destination: {
        x: Math.round(destination.x),
        y: Math.round(destination.y)
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
