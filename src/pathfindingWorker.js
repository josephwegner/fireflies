import NavMesh from 'navmesh';

let navMeshInstance = null;
let tileSize = 1;
self.onmessage = function(e) {
  if (e.data.navMeshData) {
    // Initialize with the navigation mesh data
    try {
      // Convert polygons to the format expected by the navmesh library
      const meshPolygons = e.data.navMeshData.polygons.map(poly => 
        poly.map(p => [p.x, p.y])
      );
      
      // Create the navmesh instance
      navMeshInstance = new NavMesh(meshPolygons);
      console.log({meshPolygons, navMeshInstance})
      tileSize = e.data.tileSize;
      
      self.postMessage({ type: 'navmesh_loaded', success: true });
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
      console.error('NavMesh not initialized for pathfinding');
      self.postMessage({ 
        entityId, 
        path: [], 
        pathType,
        error: 'NavMesh not initialized' 
      });
      return;
    }
    
    try {
      // Convert points to the format expected by navmesh
      const startPoint = { x: start.x * tileSize, y: start.y * tileSize };
      const endPoint = { x: destination.x * tileSize, y: destination.y * tileSize };

      // Find path using the navmesh
      const path = navMeshInstance.findPath(startPoint, endPoint);
      
      if (!path) {
        console.warn('No path found', { entityId, start, destination, pathType });
        self.postMessage({ entityId, path: [], pathType });
        return;
      }
      
      console.log({startPoint, endPoint, path})
      // Send the path back to the main thread
      self.postMessage({ entityId, path, pathType });
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
