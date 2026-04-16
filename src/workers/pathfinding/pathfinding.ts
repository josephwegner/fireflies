import { Point, NavMesh } from './types';

function snapToMesh(navMesh: NavMesh, point: Point, label: string): { snapped: Point; wasInMesh: boolean; didSnap: boolean } {
  if (navMesh.isPointInMesh(point)) return { snapped: point, wasInMesh: true, didSnap: false };
  const vec = {
    ...point,
    distance(other: Point) {
      const dx = point.x - other.x;
      const dy = point.y - other.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  };
  const closest = navMesh.findClosestMeshPoint(vec as any, 20);
  if (!closest.point) return { snapped: point, wasInMesh: false, didSnap: false };

  let snapped = { x: closest.point.x, y: closest.point.y };

  // The snapped point is on the mesh boundary (edge of a triangle). findPath's
  // internal point-in-polygon test can fail for edge points due to float precision.
  // Nudge slightly toward the polygon centroid to ensure containment.
  if (!navMesh.isPointInMesh(snapped) && closest.polygon) {
    const poly = closest.polygon as any;
    const centroid = poly.centroid;
    if (centroid) {
      const dx = centroid.x - snapped.x;
      const dy = centroid.y - snapped.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        snapped.x += (dx / dist) * 1;
        snapped.y += (dy / dist) * 1;
      }
    }
    console.debug(`[snapToMesh] ${label} edge-nudge: (${closest.point.x.toFixed(1)},${closest.point.y.toFixed(1)}) → (${snapped.x.toFixed(1)},${snapped.y.toFixed(1)}) inMeshAfter=${navMesh.isPointInMesh(snapped)}`);
  }

  return { snapped, wasInMesh: false, didSnap: true };
}

export function pathfind(navMesh: NavMesh, start: Point, destination: Point): Point[] | null {
  try {
    const startSnap = snapToMesh(navMesh, start, 'start');
    const endSnap = snapToMesh(navMesh, destination, 'dest');

    const path = navMesh.findPath(startSnap.snapped, endSnap.snapped);

    if (!path) {
      console.warn(
        `[pathfind] No path found |`,
        `start=(${start.x.toFixed(1)},${start.y.toFixed(1)}) inMesh=${startSnap.wasInMesh} didSnap=${startSnap.didSnap}`,
        `snappedTo=(${startSnap.snapped.x.toFixed(1)},${startSnap.snapped.y.toFixed(1)}) |`,
        `dest=(${destination.x.toFixed(1)},${destination.y.toFixed(1)}) inMesh=${endSnap.wasInMesh} didSnap=${endSnap.didSnap}`,
        `snappedTo=(${endSnap.snapped.x.toFixed(1)},${endSnap.snapped.y.toFixed(1)})`
      );
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
