import { ECSEntity } from '@/types';

interface EntityPosition {
  entity: ECSEntity;
  x: number;
  y: number;
}

export class SpatialGrid {
  private grid: Map<string, EntityPosition[]> = new Map();
  private readonly cellSize: number;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  insert(entity: ECSEntity, x: number, y: number): void {
    const cellKey = this.getCellKey(x, y);
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, []);
    }
    this.grid.get(cellKey)!.push({ entity, x, y });
  }

  getNearby(x: number, y: number, radius: number): ECSEntity[] {
    const nearbyEntities = new Set<ECSEntity>();
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellY = Math.floor(y / this.cellSize);
    const radiusSquared = radius * radius; // Use squared distance to avoid sqrt

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cellEntities = this.grid.get(key);
        if (cellEntities) {
          cellEntities.forEach(({ entity, x: ex, y: ey }) => {
            // Only include entities actually within the radius
            const distSquared = (ex - x) * (ex - x) + (ey - y) * (ey - y);
            if (distSquared <= radiusSquared) {
              nearbyEntities.add(entity);
            }
          });
        }
      }
    }

    return Array.from(nearbyEntities);
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
}
