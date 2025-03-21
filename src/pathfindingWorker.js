import EasyStar from 'easystarjs';


const easystar = new EasyStar.js();
easystar.setAcceptableTiles([1]); // Walkable tiles

self.onmessage = function(e) {
  if (e.data.grid) {
    let map = Array(Math.ceil(e.data.grid.height)).fill().map(() => Array(Math.ceil(e.data.grid.width)).fill(0));

    e.data.map.forEach((row, rowIndex) => {
      row.forEach((tile, tileIndex) => {
        map[rowIndex][tileIndex] = tile;
      });
    });

    easystar.setGrid(map);
    easystar.setAcceptableTiles([1]); // Walkable tiles
  } else {
    const { entityId, start, destination, pathType } = e.data;

    easystar.findPath(
      start.x,
      start.y, 
      destination.x, 
      destination.y, 
      function(path) {
        if (path === null) {
          console.error('No path found', { entityId, start, destination, pathType })
          self.postMessage({ entityId, path: [], pathType }); // No path found
        } else {
          self.postMessage({ entityId, path, pathType });
        }
      }
    );

    easystar.calculate();
  }
};
