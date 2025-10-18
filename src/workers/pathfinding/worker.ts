import { pathfind } from './pathfinding';
import { generateNavMesh, shrinkPaths, wallsToPaths } from './navmesh';
import { WorkerMessage, Point, NavMesh } from './types';

/* NavMesh cache with LRU eviction
 * Caches NavMesh by entity radius to avoid recomputation
 * Uses Map for insertion order tracking (LRU)
 */
const MAX_CACHE_SIZE = 10; // Maximum number of cached NavMeshes
const bufferedNavMeshCache = new Map<number, NavMesh>();
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
        let navMesh = bufferedNavMeshCache.get(wallBufferSize);

        if (!navMesh) {
          // Generate new NavMesh
          const multiplier = e.data.wallBufferMultiplier || 1.5;
          const shrunkPaths = shrinkPaths(baseMapPaths, e.data.radius * multiplier);
          navMesh = generateNavMesh(shrunkPaths);

          if (!navMesh) {
            console.error('[Worker] Failed to generate navmesh');
            return;
          }

          // Implement LRU eviction
          if (bufferedNavMeshCache.size >= MAX_CACHE_SIZE) {
            // Remove oldest entry (first key in Map)
            const firstKey = bufferedNavMeshCache.keys().next().value;
            if (firstKey !== undefined) {
              bufferedNavMeshCache.delete(firstKey);
            }
          }

          bufferedNavMeshCache.set(wallBufferSize, navMesh);
        } else {
          // Move to end for LRU (delete and re-add)
          bufferedNavMeshCache.delete(wallBufferSize);
          bufferedNavMeshCache.set(wallBufferSize, navMesh);
        }

        const path = pathfind(navMesh, e.data.start, e.data.destination);

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
