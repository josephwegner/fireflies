import NavMesh from 'navmesh';
import earcut, { flatten } from 'earcut';
import Shape from '@doodle3d/clipper-js';
import { Point, MultiPolygon, FlattenResult, NavMesh as INavMesh } from './types';

export function generateNavMesh(paths: Point[][]): INavMesh {
  const multiPolygon = pathsToMultiPolygon(paths);
  const triangles = triangulateMultiPolygon(multiPolygon);

  // Convert back to game format
  const convertedTriangles = triangles.map(triangle => {
    return triangle.map(p => ({ x: p[0], y: p[1] }));
  });

  return new NavMesh(convertedTriangles);
}

export function shrinkPaths(paths: Point[][], radius: number): Point[][] {
  // Shrink the outer boundary inward
  const outerShape = new Shape([paths[0]], true, true).offset(-radius);

  if (paths.length === 1) {
    return [outerShape.mapToLower()[0]];
  }

  // Grow each inner obstacle outward, then union them all into one shape
  // so overlapping obstacles (e.g. a player-built wall connecting to an
  // existing wall) merge cleanly instead of producing overlapping holes
  // that break earcut triangulation.
  let mergedInners = new Shape([paths[1]], true, true).offset(radius);
  for (let i = 2; i < paths.length; i++) {
    const grown = new Shape([paths[i]], true, true).offset(radius);
    mergedInners = mergedInners.union(grown);
  }

  // Boolean difference: subtract merged obstacles from the shrunk outer boundary.
  // This produces a clean polygon (with properly nested holes) for earcut.
  const walkable = outerShape.difference(mergedInners);
  const walkablePaths = walkable.mapToLower();

  if (!walkablePaths.length) {
    console.warn('[shrinkPaths] difference produced empty result, falling back to outer only');
    return [outerShape.mapToLower()[0]];
  }

  return walkablePaths;
}

export function wallsToPaths(walls: Point[][]): Point[][] {
  return walls.map(wall => {
    if (!wall || !wall.length) {
      return null;
    }

    // Make sure the contour is closed (first and last points are the same)
    const closedContour = [...wall];
    if (!pointsEqual(closedContour[0], closedContour[closedContour.length - 1])) {
      closedContour.push(closedContour[0]);
    }

    return closedContour;
  }).filter((path): path is Point[] => path !== null);
}

function pathsToMultiPolygon(paths: Point[][]): MultiPolygon {
  const arrayPaths = paths.map(path => {
    return path.map(point => [point.x, point.y]);
  });
  return [arrayPaths[0], ...arrayPaths.slice(1)];
}

function triangulateMultiPolygon(multiPolygon: MultiPolygon): number[][][] {
  const polygonData = flatten(multiPolygon);
  const triangleIndices = earcut(polygonData.vertices, polygonData.holes, polygonData.dimensions);

  return indicesToTriangles(triangleIndices, polygonData);
}

function indicesToTriangles(triangleIndices: number[], polyData: FlattenResult): number[][][] {
  const triangles: number[][][] = [];

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

function pointsEqual(p1: Point, p2: Point, epsilon: number = 0.001): boolean {
  // Compare points with a small epsilon to account for floating point errors
  return Math.abs(p1.x - p2.x) < epsilon && Math.abs(p1.y - p2.y) < epsilon;
}
