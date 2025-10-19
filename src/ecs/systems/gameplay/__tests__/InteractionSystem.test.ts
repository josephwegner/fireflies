import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { InteractionSystem } from '../InteractionSystem';
import {
  Position,
  Interaction,
  Targeting,
  Renderable,
  FireflyTag,
  MonsterTag,
  WispTag
} from '@/ecs/components';
import { SpatialGrid } from '@/utils';

describe('InteractionSystem', () => {
  let world: World;
  let system: InteractionSystem;
  let spatialGrid: SpatialGrid;

  beforeEach(() => {
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Interaction)
      .registerComponent(Targeting)
      .registerComponent(Renderable)
      .registerComponent(FireflyTag)
      .registerComponent(MonsterTag)
      .registerComponent(WispTag);

    spatialGrid = new SpatialGrid(100);
    world.registerSystem(InteractionSystem, { spatialGrid });
    system = world.getSystem(InteractionSystem) as InteractionSystem;
  });

  // Helper to populate spatial grid before executing system
  const populateGridAndExecute = () => {
    spatialGrid.clear();
    // Get all positioned entities and insert them into the grid
    const positionedEntities = (world.entityManager as any)._entities.filter(
      (e: any) => e.hasComponent(Position)
    );
    positionedEntities.forEach((entity: any) => {
      const pos = entity.getComponent(Position);
      if (pos) {
        spatialGrid.insert(entity, pos.x, pos.y);
      }
    });
    system.execute();
  };

  describe('potentialTargets population', () => {
    it('should populate potentialTargets when entities are in range', () => {
      // Create a firefly at position (100, 100) with interactionRadius of 50
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      // Create a monster at position (120, 100) - distance is 20, within radius
      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 120, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(1);
      expect(targeting.potentialTargets[0]).toBe(monster);
    });

    it('should not add entities outside interaction radius', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 30, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Monster at distance 50, outside radius of 30
      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 150, y: 100 })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(0);
    });

    it('should clear potentialTargets each frame', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 120, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      // First frame: monster in range
      populateGridAndExecute();
      let targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(1);

      // Move monster out of range
      const monsterPos = monster.getMutableComponent(Position)!;
      monsterPos.x = 200;

      // Second frame: should clear and not re-add
      populateGridAndExecute();
      targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(0);
    });

    it('should not add self to potentialTargets', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['firefly'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(0);
    });
  });

  describe('interactsWith filtering', () => {
    it('should only add entities matching interactsWith types', () => {
      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['firefly'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(MonsterTag);

      // Add a firefly (should be added)
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 110, y: 100 })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      // Add a wisp (should NOT be added)
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 115, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(WispTag);

      populateGridAndExecute();

      const targeting = monster.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(1);
      expect(targeting.potentialTargets[0]).toBe(firefly);
    });

    it('should handle multiple interactsWith types', () => {
      const entity = world.createEntity();
      entity
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['firefly', 'wisp'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(MonsterTag);

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 110, y: 100 })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 120, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(WispTag);

      populateGridAndExecute();

      const targeting = entity.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(2);
      expect(targeting.potentialTargets).toContain(firefly);
      expect(targeting.potentialTargets).toContain(wisp);
    });

    it('should handle empty interactsWith array', () => {
      const entity = world.createEntity();
      entity
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: [] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 110, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = entity.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(0);
    });
  });

  describe('distance calculations', () => {
    it('should correctly calculate diagonal distances', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Monster at (130, 140) - distance is sqrt(30^2 + 40^2) = 50
      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 130, y: 140 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(1);
    });

    it('should handle entities at exact radius boundary', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 30, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Monster at exactly 30 units away
      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 130, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(1);
    });
  });

  describe('multiple entities', () => {
    it('should populate potentialTargets for multiple entities simultaneously', () => {
      // Create two fireflies
      const firefly1 = world.createEntity();
      firefly1
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      const firefly2 = world.createEntity();
      firefly2
        .addComponent(Position, { x: 200, y: 200 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Create two monsters, each near one firefly
      const monster1 = world.createEntity();
      monster1
        .addComponent(Position, { x: 120, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      const monster2 = world.createEntity();
      monster2
        .addComponent(Position, { x: 220, y: 200 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting1 = firefly1.getComponent(Targeting)!;
      const targeting2 = firefly2.getComponent(Targeting)!;

      expect(targeting1.potentialTargets).toHaveLength(1);
      expect(targeting1.potentialTargets[0]).toBe(monster1);

      expect(targeting2.potentialTargets).toHaveLength(1);
      expect(targeting2.potentialTargets[0]).toBe(monster2);
    });

    it('should handle one entity targeting multiple entities', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Create three monsters in range
      const monster1 = world.createEntity();
      monster1
        .addComponent(Position, { x: 110, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      const monster2 = world.createEntity();
      monster2
        .addComponent(Position, { x: 120, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      const monster3 = world.createEntity();
      monster3
        .addComponent(Position, { x: 130, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(3);
      expect(targeting.potentialTargets).toContain(monster1);
      expect(targeting.potentialTargets).toContain(monster2);
      expect(targeting.potentialTargets).toContain(monster3);
    });
  });

  describe('edge cases', () => {
    it('should handle entity without Position component', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Monster without Position - should be ignored
      const monster = world.createEntity();
      monster.addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      expect(() => populateGridAndExecute()).not.toThrow();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(0);
    });

    it('should handle entity without Targeting component', () => {
      const entity = world.createEntity();
      entity
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(FireflyTag);

      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 110, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      // Should not throw when entity lacks Targeting component
      expect(() => populateGridAndExecute()).not.toThrow();
    });

    it('should handle zero interaction radius', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 0, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      // Monster at same position
      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      populateGridAndExecute();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(1);
    });

    it('should handle no entities in world', () => {
      expect(() => populateGridAndExecute()).not.toThrow();
    });

    it('should handle single entity in world', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Interaction, { interactionRadius: 50, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      expect(() => populateGridAndExecute()).not.toThrow();

      const targeting = firefly.getComponent(Targeting)!;
      expect(targeting.potentialTargets).toHaveLength(0);
    });
  });

  describe('spatial grid optimization', () => {
    it('should use spatial grid getNearby instead of checking all entities', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 50, y: 50 })
        .addComponent(Interaction, { interactionRadius: 30, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 60, y: 60 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      // Populate grid but don't add the monster to it
      spatialGrid.clear();
      spatialGrid.insert(firefly, 50, 50);
      // Intentionally NOT inserting monster into grid

      system.execute();

      const targeting = firefly.getComponent(Targeting)!;
      // If system uses spatial grid, it won't find the monster since it's not in the grid
      // If system iterates all entities, it would find the monster
      expect(targeting.potentialTargets).toHaveLength(0);
    });

    it('should find entities when they are properly added to spatial grid', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 50, y: 50 })
        .addComponent(Interaction, { interactionRadius: 30, interactsWith: ['monster'] })
        .addComponent(Targeting, { potentialTargets: [] })
        .addComponent(FireflyTag);

      const monster = world.createEntity();
      monster
        .addComponent(Position, { x: 60, y: 60 })
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      // Properly populate grid with both entities
      spatialGrid.clear();
      spatialGrid.insert(firefly, 50, 50);
      spatialGrid.insert(monster, 60, 60);

      system.execute();

      const targeting = firefly.getComponent(Targeting)!;
      // Now it should find the monster since it's in the grid
      expect(targeting.potentialTargets).toHaveLength(1);
      expect(targeting.potentialTargets[0]).toBe(monster);
    });
  });

  describe('canInteractWith helper', () => {
    it('should return true for firefly entities when looking for fireflies', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      expect(system.canInteractWith(firefly, ['firefly'])).toBe(true);
    });

    it('should return true for monster entities when looking for monsters', () => {
      const monster = world.createEntity();
      monster
        .addComponent(Renderable, { type: 'monster' })
        .addComponent(MonsterTag);

      expect(system.canInteractWith(monster, ['monster'])).toBe(true);
    });

    it('should return true for wisp entities when looking for wisps', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(WispTag);

      expect(system.canInteractWith(wisp, ['wisp'])).toBe(true);
    });

    it('should return false when entity type does not match', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      expect(system.canInteractWith(firefly, ['monster'])).toBe(false);
    });

    it('should return false for empty interactsWith array', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      expect(system.canInteractWith(firefly, [])).toBe(false);
    });

    it('should return true if any type in interactsWith matches', () => {
      const firefly = world.createEntity();
      firefly
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      expect(system.canInteractWith(firefly, ['monster', 'firefly', 'wisp'])).toBe(true);
    });
    
    it('should return false when entity has no Renderable component', () => {
      const entity = world.createEntity();
      entity.addComponent(FireflyTag);

      expect(system.canInteractWith(entity, ['firefly'])).toBe(false);
    });
  });
});

