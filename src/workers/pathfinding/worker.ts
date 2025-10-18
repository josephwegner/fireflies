import { pathfind } from './pathfinding';
import { generateNavMesh, shrinkPaths, wallsToPaths } from './navmesh';
import { WorkerMessage, Point, NavMesh } from './types';

/* This will be an object of the format:
 * {
 *   <wallBufferSize:string>: NavMesh
 * }
 *
 * Every time we get a pathfinding request, we check if a wall
 * buffer already exists for the radius of the object. We create a fresh
 * NavMesh if not.
 */
const bufferedNavMeshCache: Record<number, NavMesh> = {};
let baseMapPaths: Point[][] | null = null;

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  try {
    switch (e.data.action) {
      case 'buildNavMesh':
        baseMapPaths = wallsToPaths(e.data.walls);

        self.postMessage({
          action: 'navmeshReady',
          pathCount: baseMapPaths?.length || 0
        });
        break;

      case 'pathfind':
        if (!baseMapPaths) {
          console.error('[Worker] No baseMapPaths available - navmesh not built yet!');
          return;
        }

        const wallBufferSize = e.data.radius;
        if (!bufferedNavMeshCache[wallBufferSize]) {
          const multiplier = e.data.wallBufferMultiplier || 1.5;
          const shrunkPaths = shrinkPaths(baseMapPaths, e.data.radius * multiplier);
          const navMesh = generateNavMesh(shrunkPaths);
          if (!navMesh) {
            console.error('[Worker] Failed to generate navmesh');
            return;
          }

          bufferedNavMeshCache[wallBufferSize] = navMesh;
        }

        const path = pathfind(bufferedNavMeshCache[wallBufferSize], e.data.start, e.data.destination);

        if (path) {
          const formattedPath = path.map(point => ({
            x: point.x,
            y: point.y
          }));

          self.postMessage({
            entityId: e.data.entityId,
            path: formattedPath,
            pathType: e.data.pathType
          });
        }
        break;

      default:
        console.error('[Worker] Unknown action:', (e.data as any).action);
    }
  } catch (error) {
    const err = error as Error;
    console.error('[Worker] Error:', err.message);
    self.postMessage({
      action: 'error',
      error: err.message,
      stack: err.stack,
      entityId: 'entityId' in e.data ? e.data.entityId : undefined // Include entityId so we can clear pending request
    });
  }
};
