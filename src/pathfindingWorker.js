import EasyStar from 'easystarjs';

const TILE_SIZE = 32; // Define the new grid size

const easystar = new EasyStar.js();
easystar.setAcceptableTiles([0]); // Walkable tiles

self.onmessage = function(e) {
  if (e.data.grid) {
    let grid = Array(Math.ceil(e.data.grid.height / TILE_SIZE)).fill().map(() => Array(Math.ceil(e.data.grid.width / TILE_SIZE)).fill(0));
    easystar.setGrid(grid);
  } else {
    const { entityId, start, destination, pathType } = e.data;

    easystar.findPath(
      Math.floor(start.x / TILE_SIZE),
      Math.floor(start.y / TILE_SIZE), 
      Math.floor(destination.x / TILE_SIZE), 
      Math.floor(destination.y / TILE_SIZE), 
      function(path) {
        if (path === null) {
          self.postMessage([]); // No path found
        } else {
            let pixelPath = path.map(p => ({
                x: p.x * TILE_SIZE + TILE_SIZE / 2,
                y: p.y * TILE_SIZE + TILE_SIZE / 2
            }));

            self.postMessage({ entityId, path: pixelPath, pathType });
        }
      }
    );

    easystar.calculate();
  }
};
