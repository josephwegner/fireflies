import { Point, NavMesh } from './types';

export function pathfind(navMesh: NavMesh, start: Point, destination: Point): Point[] | null {
  try {
    // Convert points to the format expected by navmesh
    const startPoint: Point = {
      x: start.x,
      y: start.y
    };
    const endPoint: Point = {
      x: destination.x,
      y: destination.y
    };

    // Find path using the navmesh
    const path = navMesh.findPath(startPoint, endPoint);

    if (!path) {
      return null;
    }

    const formattedPath = path.map(point => ({
      x: point.x,
      y: point.y
    }));

    return formattedPath;
  } catch (error) {
    console.error('Error finding path:', error, { start, destination });
    return null;
  }
}
