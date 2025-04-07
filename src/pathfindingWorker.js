import NavMesh from 'navmesh';

let navMeshInstance = null;
self.onmessage = function(e) {
  if (e.data.navMeshData) {
    // Initialize with the navigation mesh data
    try {
      navMeshInstance = new NavMesh(e.data.navMeshData.polygons);
    } catch (error) {
      console.error('Error initializing NavMesh in worker:', error);
      self.postMessage({ 
        type: 'navmesh_loaded', 
        success: false, 
        error: error.message 
      });
    }
  } else {
    // Handle pathfinding request
    const { entityId, start, destination, pathType } = e.data;
    
    if (!navMeshInstance) {
      return;
    }

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
      const path = navMeshInstance.findPath(startPoint, endPoint)

      if (!path) {
        console.warn('No path found', {
          entityId,
          startPoint,
          endPoint,
          pathType,
          isStartInNavMesh: navMeshInstance.isPointInMesh(startPoint),
          isEndInNavMesh: navMeshInstance.isPointInMesh(endPoint)
        });
        self.postMessage({ entityId, path: [], pathType });
        return;
      }
      
      const formattedPath = path.map(point => {
        return {
          x: point.x,
          y: point.y
        }
      })
      
      // Send the path back to the main thread
      self.postMessage({ entityId, path: formattedPath, pathType });
    } catch (error) {
      console.error('Error finding path:', error, { entityId, start, destination });
      self.postMessage({ 
        entityId, 
        path: [], 
        pathType,
        error: error.message 
      });
    }
  }
};
