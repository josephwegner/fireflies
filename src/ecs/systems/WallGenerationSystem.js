import { System } from 'ecsy';
import WallComponent from '../components/WallComponent';
import TypeComponent from '../components/TypeComponent';
import InteractionComponent from '../components/InteractionComponent';
import RepulsionInteraction from '../interactions/RepulsionInteraction';

const CASE_LOOKUP = {
  0: [],
  1: [['left', 'top']],
  2: [['top', 'right']],
  3: [['left', 'right']],
  4: [['left', 'bottom']],
  5: [['top', 'bottom']],
  6: [['top', 'bottom']],
  7: [['right', 'bottom']],
  8: [['right', 'bottom']],
  9: [['top', 'bottom']],
  10: [['top', 'bottom']],
  11: [['left', 'bottom']],
  12: [['left', 'right']],
  13: [['top', 'right']],
  14: [['left', 'top']],
  15: []
};

export default class WallGenerationSystem extends System {
  init() {
    this.wallEntity = null;
  }

  execute() {
    // Only generate walls once
    if (this.wallEntity) { return; }
    
    const map = this.world.scene.map;
    if (!map) return;
    
    // Create an entity to hold all wall data
    this.wallEntity = this.world.createEntity()
    
    this.wallEntity.addComponent(WallComponent, {
      segments: this.generateWallSegments(map),
      thickness: 2,
      color: 0x888888
    });

    this.wallEntity.addComponent(TypeComponent, {
      type: 'wall'
    });

    this.wallEntity.addComponent(InteractionComponent, {
      interactions: { 
        firefly: new RepulsionInteraction({ distance: 10 }),
        monster: new RepulsionInteraction({ distance: 20 })
      }
    });
  }

  generateWallSegments(map) {
    const tileSize = 32;
    const contours = this.marchingSquaresContours(map, tileSize);
    
    // Apply smoothing to create fluid curves
    return contours.map(contour => this.smoothWallSegment(contour));
  }
  
  marchingSquaresContours(map, tileSize) {
    const height = map.length;
    const width = map[0].length;
    const segments = [];

    // Define midpoints for each cell edge
    const midpoints = {
      top: [0.5, 0],    
      right: [1, 0.5],  
      bottom: [0.5, 1], 
      left: [0, 0.5]    
    };

    // Process each cell in the grid
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        // Get the four corners of this cell
        const p0 = map[y][x];
        const p1 = map[y][x + 1];
        const p2 = map[y + 1][x];
        const p3 = map[y + 1][x + 1];

        // Create a case index (0-15) based on which corners are inside/outside
        let caseIndex = (p0 * 1) + (p1 * 2) + (p2 * 4) + (p3 * 8);
        caseIndex = 15 - caseIndex;

        // Get line segments for this case
        const caseSegments = CASE_LOOKUP[caseIndex];
        
        // Convert to world coordinates and add to segments list
        caseSegments.forEach(([edge1, edge2]) => {
          const p1 = {
            x: (x + midpoints[edge1][0]) * tileSize,
            y: (y + midpoints[edge1][1]) * tileSize
          };
          const p2 = {
            x: (x + midpoints[edge2][0]) * tileSize,
            y: (y + midpoints[edge2][1]) * tileSize
          };

          segments.push([p1, p2]);
        });
      }
    }
    
    return this.buildContoursFromSegments(segments);
  }

  buildContoursFromSegments(segments) {
    // Create a map of point to connected points
    const connections = new Map();
    
    // Helper to get a unique key for a point
    const pointKey = p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    
    // Build connections map
    segments.forEach(([p1, p2]) => {
      const k1 = pointKey(p1);
      const k2 = pointKey(p2);
      
      if (!connections.has(k1)) connections.set(k1, []);
      if (!connections.has(k2)) connections.set(k2, []);
      
      connections.get(k1).push(p2);
      connections.get(k2).push(p1);
    });
    
    // Track visited segments to avoid duplicates
    const visited = new Set();
    const contours = [];
    
    // Helper to mark a segment as visited
    const markVisited = (a, b) => {
      visited.add(`${pointKey(a)}-${pointKey(b)}`);
      visited.add(`${pointKey(b)}-${pointKey(a)}`);
    };
    
    // Helper to check if a segment is visited
    const isVisited = (a, b) => {
      return visited.has(`${pointKey(a)}-${pointKey(b)}`) || 
             visited.has(`${pointKey(b)}-${pointKey(a)}`);
    };
    
    // Find starting points (any unvisited point)
    for (const [key, connectedPoints] of connections.entries()) {
      const startPoint = this.parsePointKey(key);
      
      // For each connected point that forms an unvisited segment
      for (const nextPoint of connectedPoints) {
        if (isVisited(startPoint, nextPoint)) continue;
        
        // Start a new contour
        const contour = [startPoint];
        let current = nextPoint;
        let previous = startPoint;
        
        markVisited(previous, current);
        contour.push(current);
        
        // Follow the path until we can't continue
        let foundClosed = false;
        while (true) {
          // Find next unvisited connection
          const neighbors = connections.get(pointKey(current)) || [];
          let nextFound = false;
          
          for (const neighbor of neighbors) {
            if (!isVisited(current, neighbor)) {
              previous = current;
              current = neighbor;
              markVisited(previous, current);
              contour.push(current);
              nextFound = true;
              break;
            }
          }
          
          if (!nextFound) break;
          
          // Check if we've closed the loop
          if (pointKey(current) === pointKey(startPoint)) {
            foundClosed = true;
            break;
          }
        }
        
        // Only add contours with at least 3 points
        if (contour.length >= 3) {
          contours.push(contour);
        }
      }
    }
    
    return contours;
  }
  
  parsePointKey(key) {
    const [x, y] = key.split(',');
    return { x: parseFloat(x), y: parseFloat(y) };
  }
  
  smoothWallSegment(points) {
    if (points.length < 3) return points;
    
    const smoothedPoints = [];
    const tension = 0.5;
    
    smoothedPoints.push(points[0]);
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
      
      const numPoints = 5;
      for (let t = 0; t < 1; t += 1/numPoints) {
        smoothedPoints.push(this.getCatmullRomPoint(t, p0, p1, p2, p3, tension));
      }
    }
    
    smoothedPoints.push(points[points.length - 1]);
    
    return smoothedPoints;
  }
  
  getCatmullRomPoint(t, p0, p1, p2, p3, tension) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    
    return { x, y };
  }
}

WallGenerationSystem.queries = {}; 