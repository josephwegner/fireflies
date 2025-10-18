import { pathfind } from './pathfinding.js'
import { generateNavMesh, shrinkPaths, wallsToPaths } from './navmesh.js'

/* This will be an object of the format:
 * {
 *   <wallBufferSize:string>: NavMesh
 * }
 * 
 * Every time we get a pathfinding request, we check if a wall
 * buffer already exists for the radius of the object. We create a fresh
 * NavMesh if not.
*/
let bufferedNavMeshCache = {}

self.onmessage = function(e) {
  try {
    switch(e.data.action) {
      case 'buildNavMesh':
        this.baseMapPaths = wallsToPaths(e.data.walls)

        self.postMessage({
          action: 'navmeshReady',
          pathCount: this.baseMapPaths?.length || 0
        });
        break

    case 'pathfind':
      if (!this.baseMapPaths) {
        console.error('[Worker] No baseMapPaths available - navmesh not built yet!')
        return
      }

      const wallBufferSize = e.data.radius
      if (!bufferedNavMeshCache[wallBufferSize]) {
        const multiplier = e.data.wallBufferMultiplier || 1.5
        const shrunkPaths = shrinkPaths(this.baseMapPaths, e.data.radius * multiplier)
        const navMesh = generateNavMesh(shrunkPaths)
        if (!navMesh) {
          console.error('[Worker] Failed to generate navmesh')
          return
        }

        bufferedNavMeshCache[wallBufferSize] = navMesh
      }

      const path = pathfind(bufferedNavMeshCache[wallBufferSize], e.data.start, e.data.destination)

      if (path) {
        const formattedPath = path.map(point => {
          return {
            x: point.x,
            y: point.y
          }
        })

        self.postMessage({
          entityId: e.data.entityId,
          path: formattedPath,
          pathType: e.data.pathType
        });
      }
      break

      default:
        console.error('[Worker] Unknown action:', e.data.action)
    }
  } catch (error) {
    console.error('[Worker] Error:', error.message);
    self.postMessage({
      action: 'error',
      error: error.message,
      stack: error.stack
    });
  }
}