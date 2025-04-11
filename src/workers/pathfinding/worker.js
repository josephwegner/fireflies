import { pathfind } from './pathfinding.js'
import { generateNavMesh, generateMapPolygons, shrinkPaths, wallsToPaths } from './navmesh.js'

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
  switch(e.data.action) {
    case 'buildNavMesh':
      this.baseMapPaths = wallsToPaths(e.data.walls)
      break

    case 'pathfind':
      if (!this.baseMapPaths) {
        console.error('No polygons available')
        return
      }

      const wallBufferSize = e.data.radius
      if (!bufferedNavMeshCache[wallBufferSize]) {
        const shrunkPaths = shrinkPaths(this.baseMapPaths, e.data.radius * 1.5)
        const navMesh = generateNavMesh(shrunkPaths)
        if (!navMesh) {
          console.error('Failed to generate navmesh', e.data.walls, e.data.radius)
          return
        }

        bufferedNavMeshCache[wallBufferSize] = navMesh
      }

      const path = pathfind(bufferedNavMeshCache[wallBufferSize], e.data.start, e.data.destination)

      if (!path) {
        console.warn('No path found', {
          entityId: e.data.entityId,
          start: e.data.start,
          destination: e.data.destination,
          pathType: e.data.pathType
        });
      } else {
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
      console.error('Unknown pathfinding worker action', e.data)
  }
}