import { System, Not} from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PathComponent from '../components/PathComponent';
import DestinationComponent from '../components/DestinationComponent';
import TypeComponent from '../components/TypeComponent';
import RenderableComponent from '../components/RenderableComponent';

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

  execute(delta, time) {
    // Get all entities that need a new destination (have velocity but empty path)
    this.queries.needsDestination.results.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const pathComp = entity.getMutableComponent(PathComponent);
      const entityType = entity.getComponent(TypeComponent).type;

      if (pathComp.currentPath === null) {
        return // Can't calculate anything without a current path!
      }

      // Find the goal destination for this entity type
      const finalDestination = this.findGoalDestination(entityType);

      if (!finalDestination) {
        return; // No goal found for this entity type
      }

      if(!pathComp.currentPath.length) {
        const currentPos = {
          x: position.x,
          y: position.y
        }
        
        const destinations = this.gatherDestinations(currentPos, finalDestination, entityType, pathComp.direction);

        if (!destinations.length) {
          destinations.push(finalDestination)
        }

        this.requestPath(entity, currentPos, {
          x: destinations[0].pos.x,
          y: destinations[0].pos.y
        }, 'current')

        if (destinations.length < 1) {
          pathComp.nextPath = null;
        }
      } else if (pathComp.nextPath !== null && !pathComp.nextPath.length) {
        const lastPos = pathComp.currentPath[pathComp.currentPath.length - 1]
        
        const destinations = this.gatherDestinations(lastPos, finalDestination, entityType, pathComp.direction);

        if (!destinations.length) {
          destinations.push(finalDestination)
        }

        this.requestPath(entity, lastPos, {
          x: destinations[0].pos.x,
          y: destinations[0].pos.y
        }, 'next')

        if (destinations.length < 1) {
          pathComp.nextPath = null;
        }
      }
    });
  }

  // Find the goal destination for a specific entity type
  findGoalDestination(entityType) {
    let goalDestination = null;
    
    this.queries.destinations.results.forEach(destination => {
      // Check if this destination is for the entity's type and is a goal
      const destComp = destination.getComponent(DestinationComponent);
      const destType = destination.getComponent(TypeComponent).type
      const pos = destination.getComponent(PositionComponent);

      if (destComp.for.includes(entityType) && destType === 'goal') {
        goalDestination = {
          entity: destination,
          pos: pos
        };
      }
    });
    
    return goalDestination;
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

  gatherDestinations(current, finalDest, entityType, minScoreThreshold = 1.0, direction) {
    // Compute the ideal direction vector from current to final destination
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
    
    this.queries.destinations.results.forEach(entity => {
      const destComp = entity.getComponent(DestinationComponent);
      const typeComp = entity.getComponent(TypeComponent).type;
      const destPos = entity.getComponent(PositionComponent);
      
      // Don't include goals - those will get injected later
      if (typeComp === 'goal') return;

      // Skip if this destination is not for this entity type
      if (!destComp.for.includes(entityType)) return;
      
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

      // If this is the goal destination, give it a minimum score
      if (typeComp.type === 'goal') {
        score = Math.max(score, minScoreThreshold);
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
    const sortModifier = direction === 'r' ? 1 : -1;
    candidates.sort((a, b) => b.score - (a.score * sortModifier));
    return candidates;
  }

  requestPath(entity, start, destination, pathType) {
    const startPoint = {
      x: start.x,  
      y: start.y
    };
    
    const endPoint = {
      x: destination.x,  
      y: destination.y
    };

    let radius = 0
    if (entity.hasComponent(RenderableComponent)) {
      const renderComp = entity.getComponent(RenderableComponent)
      radius = renderComp.radius
    }
    
    // Send the path request to the worker
    this.worker.postMessage({
      action: 'pathfind',
      entityId: entity.id,
      start: startPoint,
      destination: endPoint,
      pathType,
      radius
    });
  }
}

DestinationSystem.queries = {
  needsDestination: {
    components: [PositionComponent, VelocityComponent, PathComponent, TypeComponent],
    listen: {
      changed: [PathComponent]
    }
  },
  destinations: {
    components: [PositionComponent, DestinationComponent, TypeComponent]
  }
};
