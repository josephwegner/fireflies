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
  function offsetShape(shape: Shape, offset: number): Shape {
    return shape.offset(-offset);
  }

  const outerPath = offsetShape(new Shape([paths[0]], true, true), radius);
  const innerPaths = paths.slice(1).map(path => offsetShape(new Shape([path], true, true), -radius));

  // Turn it back into a MultiPolygon
  return [outerPath.mapToLower()[0], ...innerPaths.map(p => p.mapToLower()[0])];
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
