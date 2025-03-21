import { System } from 'ecsy';
import WallComponent from '../components/WallComponent';

export default class WallGenerationSystem extends System {
  init() {
    this.wallEntity = null;
  }

  execute() {
    // Only generate walls once
    if (this.wallEntity) return;
    
    const map = this.world.scene.map;
    if (!map) return;
    
    // Create an entity to hold all wall data
    this.wallEntity = this.world.createEntity().addComponent(WallComponent, {
      segments: this.generateWallSegments(map),
      thickness: 2,
      color: 0x888888
    });
  }

  generateWallSegments(map) {
    const tileSize = 32; // The visual size of each tile
    const height = map.length;
    const width = map[0].length;
    
    // First, identify all boundary edges between walkable and non-walkable tiles
    const edges = [];
    
    // Check horizontal edges
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        if ((map[y][x] === 1 && map[y][x + 1] === 0) || 
            (map[y][x] === 0 && map[y][x + 1] === 1)) {
          // This is a boundary edge
          edges.push({
            x: (x + 1) * tileSize,
            y: y * tileSize,
            type: 'vertical',
            length: tileSize
          });
        }
      }
    }
    
    // Check vertical edges
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height - 1; y++) {
        if ((map[y][x] === 1 && map[y + 1][x] === 0) || 
            (map[y][x] === 0 && map[y + 1][x] === 1)) {
          // This is a boundary edge
          edges.push({
            x: x * tileSize,
            y: (y + 1) * tileSize,
            type: 'horizontal',
            length: tileSize
          });
        }
      }
    }
    
    // Add outer map boundaries if they're walkable tiles
    // Top boundary
    for (let x = 0; x < width; x++) {
      if (map[0][x] === 1) {
        edges.push({
          x: x * tileSize,
          y: 0,
          type: 'horizontal',
          length: tileSize
        });
      }
    }
    
    // Bottom boundary
    for (let x = 0; x < width; x++) {
      if (map[height - 1][x] === 1) {
        edges.push({
          x: x * tileSize,
          y: height * tileSize,
          type: 'horizontal',
          length: tileSize
        });
      }
    }
    
    // Left boundary
    for (let y = 0; y < height; y++) {
      if (map[y][0] === 1) {
        edges.push({
          x: 0,
          y: y * tileSize,
          type: 'vertical',
          length: tileSize
        });
      }
    }
    
    // Right boundary
    for (let y = 0; y < height; y++) {
      if (map[y][width - 1] === 1) {
        edges.push({
          x: width * tileSize,
          y: y * tileSize,
          type: 'vertical',
          length: tileSize
        });
      }
    }
    
    // Now convert these edges into actual wall segments with points
    const wallSegments = [];
    
    edges.forEach(edge => {
      const points = [];
      
      if (edge.type === 'horizontal') {
        // Add some variation to horizontal edges
        const baseY = edge.y;
        const startX = edge.x;
        const endX = edge.x + edge.length;
        
        // Add start point with slight variation
        points.push({
          x: startX,
          y: baseY + this.getRandomVariation(3)
        });
        
        // Add end point with slight variation
        points.push({
          x: endX,
          y: baseY + this.getRandomVariation(3)
        });
      } else { // vertical edge
        // Add some variation to vertical edges
        const baseX = edge.x;
        const startY = edge.y;
        const endY = edge.y + edge.length;
        
        // Add start point with slight variation
        points.push({
          x: baseX + this.getRandomVariation(3),
          y: startY
        });
        
        // Add end point with slight variation
        points.push({
          x: baseX + this.getRandomVariation(3),
          y: endY
        });
      }
      
      wallSegments.push(points);
    });
    
    // Connect wall segments that are close to each other
    const connectedSegments = this.connectWallSegments(wallSegments);
    
    // Apply smoothing to create fluid curves
    return connectedSegments.map(segment => this.smoothWallSegment(segment));
  }
  
  getRandomVariation(maxAmount) {
    return (Math.random() - 0.5) * maxAmount * 2;
  }
  
  connectWallSegments(segments) {
    // Find segments that have endpoints close to each other and connect them
    const connectedSegments = [];
    const usedSegments = new Set();
    
    for (let i = 0; i < segments.length; i++) {
      if (usedSegments.has(i)) continue;
      
      const currentPath = [...segments[i]];
      usedSegments.add(i);
      
      let foundConnection = true;
      while (foundConnection) {
        foundConnection = false;
        
        for (let j = 0; j < segments.length; j++) {
          if (usedSegments.has(j)) continue;
          
          const segment = segments[j];
          const lastPoint = currentPath[currentPath.length - 1];
          const firstPoint = currentPath[0];
          
          // Check if this segment connects to the end of our path
          if (this.pointsAreClose(lastPoint, segment[0])) {
            currentPath.push(...segment.slice(1));
            usedSegments.add(j);
            foundConnection = true;
            break;
          } 
          // Check if this segment connects to the start of our path
          else if (this.pointsAreClose(firstPoint, segment[segment.length - 1])) {
            currentPath.unshift(...segment.slice(0, -1));
            usedSegments.add(j);
            foundConnection = true;
            break;
          }
          // Check if we need to reverse the segment to connect
          else if (this.pointsAreClose(lastPoint, segment[segment.length - 1])) {
            currentPath.push(...segment.slice(0, -1).reverse());
            usedSegments.add(j);
            foundConnection = true;
            break;
          }
          else if (this.pointsAreClose(firstPoint, segment[0])) {
            currentPath.unshift(...segment.slice(1).reverse());
            usedSegments.add(j);
            foundConnection = true;
            break;
          }
        }
      }
      
      connectedSegments.push(currentPath);
    }
    
    return connectedSegments;
  }
  
  pointsAreClose(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < 8; // Threshold for connecting points
  }
  
  smoothWallSegment(points) {
    if (points.length < 3) return points;
    
    // Use Catmull-Rom spline for smooth curves
    const smoothedPoints = [];
    const tension = .5; // Lower values create smoother curves
    
    // Add first point
    smoothedPoints.push(points[0]);
    
    // Generate smooth curve points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
      
      // Add several points along the curve for smoother appearance
      const numPoints = 5; // Number of points to generate between each pair
      for (let t = 0; t < 1; t += 1/numPoints) {
        smoothedPoints.push(this.getCatmullRomPoint(t, p0, p1, p2, p3, tension));
      }
    }
    
    // Add last point
    smoothedPoints.push(points[points.length - 1]);
    
    return smoothedPoints;
  }
  
  getCatmullRomPoint(t, p0, p1, p2, p3, tension) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    // Catmull-Rom spline formula
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