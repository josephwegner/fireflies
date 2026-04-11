import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import { SpatialGrid } from '../SpatialGrid';
import type { Entity, GameWorld } from '@/ecs/Entity';

describe('SpatialGrid', () => {
  let grid: SpatialGrid;
  let world: GameWorld;
  let entity1: Entity;
  let entity2: Entity;
  let entity3: Entity;

  beforeEach(() => {
    grid = new SpatialGrid(100);
    world = new World<Entity>();
    entity1 = world.add({ position: { x: 50, y: 50 } });
    entity2 = world.add({ position: { x: 60, y: 60 } });
    entity3 = world.add({ position: { x: 150, y: 150 } });
  });

  describe('insertion and retrieval', () => {
    it('should insert and retrieve entities correctly', () => {
      grid.insert(entity1, 50, 50);
      grid.insert(entity2, 60, 60);
      grid.insert(entity3, 150, 150);

      const nearby = grid.getNearby(55, 55, 10);
      expect(nearby).toHaveLength(2);
      expect(nearby).toContain(entity1);
      expect(nearby).toContain(entity2);
    });

    it('should return an empty array for empty cells', () => {
      grid.insert(entity1, 50, 50);
      const nearby = grid.getNearby(500, 500, 10);
      expect(nearby).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all entities from the grid', () => {
      grid.insert(entity1, 50, 50);
      grid.clear();
      const nearby = grid.getNearby(50, 50, 10);
      expect(nearby).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle entities exactly on cell boundaries', () => {
      const boundaryEntity = world.add({ position: { x: 100, y: 100 } });
      grid.insert(boundaryEntity, 100, 100);

      const nearby = grid.getNearby(101, 101, 5);
      expect(nearby).toContain(boundaryEntity);
    });

    it('should handle large radius queries spanning multiple cells', () => {
      grid.insert(entity1, 50, 50);
      grid.insert(entity3, 150, 150);

      const nearby = grid.getNearby(75, 75, 110);
      expect(nearby).toHaveLength(2);
      expect(nearby).toContain(entity1);
      expect(nearby).toContain(entity3);
    });

    it('should not return duplicate entities if radius covers multiple cells containing the same entities', () => {
      grid.insert(entity1, 50, 50);
      const nearby = grid.getNearby(50, 50, 150);
      expect(nearby).toHaveLength(1);
      expect(nearby[0]).toBe(entity1);
    });
  });
});
