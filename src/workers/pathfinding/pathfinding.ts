import { Point, NavMesh } from './types';

function snapToMesh(navMesh: NavMesh, point: Point): Point {
  if (navMesh.isPointInMesh(point)) return point;
  const vec = {
    ...point,
    distance(other: Point) {
      const dx = point.x - other.x;
      const dy = point.y - other.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  };
  const closest = navMesh.findClosestMeshPoint(vec as any, 20);
  return closest.point ?? point;
}

export function pathfind(navMesh: NavMesh, start: Point, destination: Point): Point[] | null {
  try {
    const startPoint = snapToMesh(navMesh, start);
    const endPoint = snapToMesh(navMesh, destination);

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
