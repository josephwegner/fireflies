import { World } from 'ecsy';
import { SpatialGrid } from '../';
import { ECSEntity } from '@/types';
import { Position } from '@/ecs/components';

describe('SpatialGrid', () => {
  let grid: SpatialGrid;
  let world: World;
  let entity1: ECSEntity;
  let entity2: ECSEntity;
  let entity3: ECSEntity;

  beforeEach(() => {
    grid = new SpatialGrid(100);
    world = new World();
    world.registerComponent(Position);  // Register the component!
    entity1 = world.createEntity().addComponent(Position, { x: 50, y: 50 });
    entity2 = world.createEntity().addComponent(Position, { x: 60, y: 60 });
    entity3 = world.createEntity().addComponent(Position, { x: 150, y: 150 });
  });

  describe('insertion and retrieval', () => {
    it('should insert and retrieve entities correctly', () => {
      grid.insert(entity1, 50, 50);
      grid.insert(entity2, 60, 60);
      grid.insert(entity3, 150, 150);

      // entity1 and entity2 should be in cell 0,0
      // entity3 should be in cell 1,1
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
      const boundaryEntity = world.createEntity().addComponent(Position, { x: 100, y: 100 });
      grid.insert(boundaryEntity, 100, 100);

      // Should be in cell 1,1
      const nearby = grid.getNearby(101, 101, 5);
      expect(nearby).toContain(boundaryEntity);
    });

    it('should handle large radius queries spanning multiple cells', () => {
      grid.insert(entity1, 50, 50); // cell 0,0
      grid.insert(entity3, 150, 150); // cell 1,1

      // Query with radius 110 to include both entities
      // Distance from (75,75) to (50,50) is ~35.4
      // Distance from (75,75) to (150,150) is ~106.1
      const nearby = grid.getNearby(75, 75, 110);
      expect(nearby).toHaveLength(2);
      expect(nearby).toContain(entity1);
      expect(nearby).toContain(entity3);
    });

    it('should not return duplicate entities if radius covers multiple cells containing the same entities', () => {
      // This scenario is implicitly tested by getNearby using a Set,
      // but an explicit test ensures the behavior.
      grid.insert(entity1, 50, 50);
      const nearby = grid.getNearby(50, 50, 150); // query from cell 0,0 that covers cell 0,0
      expect(nearby).toHaveLength(1);
      expect(nearby[0]).toBe(entity1);
    });
  });
});
