import EasyStar from 'easystarjs';

const TILE_SIZE = 32; // Define the new grid size

self.onmessage = function(e) {
  const { grid, entityId, start, destination } = e.data;

  const easystar = new EasyStar.js();
  easystar.setGrid(grid);
  easystar.setAcceptableTiles([0]); // Walkable tiles

  easystar.findPath(start.x, start.y, destination.x, destination.y, function(path) {
    if (path === null) {
      self.postMessage([]); // No path found
    } else {
        let pixelPath = path.map(p => ({
            x: p.x * TILE_SIZE + TILE_SIZE / 2,
            y: p.y * TILE_SIZE + TILE_SIZE / 2
        }));

        self.postMessage({ entityId, path: pixelPath });
    }
  });

  easystar.calculate();
};
