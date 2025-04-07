import { System } from 'ecsy';
import WallComponent from '../components/WallComponent';
import polygonClipping from 'polygon-clipping';
import decomp from 'poly-decomp';
import NavMesh from 'navmesh';
import NavMeshComponent from '../components/NavMeshComponent';
import earcut, { flatten } from 'earcut';

export default class NavMeshSystem extends System {
  constructor(world, attributes) {
    super(world, attributes);
    this.map = attributes.map
    this.scene = this.world.scene
    this.tileSize = this.world.scene.tileSize || 32;
    this.navMeshEntity = null;
    this.worker = world.scene.pathfindingWorker
  }

  execute() {
    if (this.queries.navMesh.results.length > 0) {
      return;
    }

    const navMeshData = this.generateNavMesh()
    
    this.navMeshEntity = this.world.createEntity()
      .addComponent(NavMeshComponent, {
        polygons: navMeshData.polygons
      });

    this.worker.postMessage({
      navMeshData: navMeshData
    });
  }

  generateNavMesh() {
    const walls = this.queries.wallContours.results[0].getComponent(WallComponent).segments

    // Create navigation polygons from the inverse of wall areas
    const navPolygons = this.createNavigablePolygons(walls, this.map);
    return {
      polygons: navPolygons
    };
  }

  createNavigablePolygons(walls, map) {
    // Convert all walls to the format expected by polygon-clipping
    const wallPolygons = walls.map(wall => {
      if (!wall || !wall.length) {
        return null;
      }
      
      // Make sure the contour is closed (first and last points are the same)
      const closedContour = [...wall];
      if (!this.pointsEqual(closedContour[0], closedContour[closedContour.length - 1])) {
        closedContour.push(closedContour[0]);
      }

      return closedContour.map(segment => {
        return [segment.x, segment.y]
      });
    }).filter(Boolean);

    const multiPolygon = [wallPolygons[0], ...wallPolygons.slice(1)];
    
    // Triangulate the polygons with holes
    const triangulatedPolygons = this.triangulateMultiPolygon(multiPolygon);
    
    // Convert back to our format
    const convertedPolygons = triangulatedPolygons.map(polygon => {
      return polygon.map(p => ({ x: p[0], y: p[1] }));
    });

    return convertedPolygons;
  }


  triangulateMultiPolygon(multiPolygon) {
    return this.triangulatePolygonWithHoles(flatten(multiPolygon));
  }

  triangulatePolygonWithHoles(data) {
    const triangleIndices = earcut(data.vertices, data.holes, data.dimensions);
    
    // Convert triangle indices back to polygon format
    return this.indicesToTriangles(triangleIndices, data);
  }

  indicesToTriangles(triangleIndices, polyData) {
    const triangles = [];
    
    for (let i = 0; i < triangleIndices.length; i += 3) {
      const triangle = [
        [polyData.vertices[triangleIndices[i] * 2], polyData.vertices[triangleIndices[i] * 2 + 1]],
        [polyData.vertices[triangleIndices[i + 1] * 2], polyData.vertices[triangleIndices[i + 1] * 2 + 1]],
        [polyData.vertices[triangleIndices[i + 2] * 2], polyData.vertices[triangleIndices[i + 2] * 2 + 1]]
      ];
      triangles.push(triangle);
    }

    return triangles;
  }

  decompose(poly) {
    try {
      // Ensure the polygon is simple (no self-intersections)
      if (!decomp.isSimple(poly)) {
        console.warn('Non-simple polygon detected, attempting to fix');
        // For non-simple polygons, we could try to fix them or just return the original
        return poly;
      }
      decomp.makeCCW(poly)
      // Decompose into convex parts
      return decomp.quickDecomp(poly);
      
    } catch (error) {
      console.error('Error in polygon decomposition:', error);
      return poly; // Return original polygon on error
    }
  }

  pointsEqual(p1, p2, epsilon = 0.001) {
    // Compare points with a small epsilon to account for floating point errors
    return Math.abs(p1.x - p2.x) < epsilon && Math.abs(p1.y - p2.y) < epsilon;
  }

  findPath(start, end) {
    const navMeshEntity = this.queries.navMesh.results[0];
    if (!navMeshEntity) {
      return null;
    }
    
    const navMeshComponent = navMeshEntity.getComponent(NavMeshComponent);
    const navMeshInstance = navMeshComponent.navMeshInstance;
    
    if (!navMeshInstance) {
      return null;
    }
    
    try {
      // Find path using the navmesh library
      const path = navMeshInstance.findPath(
        [start.x, start.y],
        [end.x, end.y]
      );
      
      // Convert path to our format
      return path ? path.map(([x, y]) => ({ x, y })) : null;
    } catch (error) {
      console.error('Error finding path:', error);
      return null;
    }
  }
}

NavMeshSystem.queries = {
  wallContours: { components: [WallComponent] },
  navMesh: { components: [NavMeshComponent] }
}