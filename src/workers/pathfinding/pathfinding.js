export function pathfind(navMesh, start, destination) {
  try {
    // Convert points to the format expected by navmesh
    const startPoint = {
      x: start.x,
      y: start.y
    };
    const endPoint = {
      x: destination.x,
      y: destination.y
    };

    // Find path using the navmesh
    const path = navMesh.findPath(startPoint, endPoint)

    if (!path) {
      return null
    }
    
    const formattedPath = path.map(point => {
      return {
        x: point.x,
        y: point.y
      }
    })

    return formattedPath
  } catch (error) {
    console.error('Error finding path:', error, { start, destination });
  }
}
