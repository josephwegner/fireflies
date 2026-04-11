import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { InteractionSystem } from '../InteractionSystem';
import { SpatialGrid } from '@/utils';

describe('InteractionSystem', () => {
  let world: GameWorld;
  let system: InteractionSystem;
  let spatialGrid: SpatialGrid;

  beforeEach(() => {
    world = new World<Entity>();
    spatialGrid = new SpatialGrid(100);
    system = new InteractionSystem(world, { spatialGrid });
  });

  const populateGridAndExecute = () => {
    spatialGrid.clear();
    for (const entity of world.with('position')) {
      spatialGrid.insert(entity, entity.position.x, entity.position.y);
    }
    system.update(16, 16);
  };

  describe('potentialTargets population', () => {
    it('should populate potentialTargets when entities are in range', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      const monster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(monster);
    });

    it('should not add entities outside interaction radius', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 30, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        position: { x: 150, y: 100 },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should clear potentialTargets each frame', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      const monster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();
      expect(firefly.targeting!.potentialTargets).toHaveLength(1);

      monster.position!.x = 200;

      populateGridAndExecute();
      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should not add self to potentialTargets', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['firefly'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });
  });

  describe('interactsWith filtering', () => {
    it('should only add entities matching interactsWith types', () => {
      const monster = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['firefly'] },
        targeting: { potentialTargets: [] },
        monsterTag: true
      });

      const firefly = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      world.add({
        position: { x: 115, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        wispTag: true
      });

      populateGridAndExecute();

      expect(monster.targeting!.potentialTargets).toHaveLength(1);
      expect(monster.targeting!.potentialTargets[0]).toBe(firefly);
    });

    it('should handle multiple interactsWith types', () => {
      const entity = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['firefly', 'wisp'] },
        targeting: { potentialTargets: [] },
        monsterTag: true
      });

      const firefly = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        wispTag: true
      });

      populateGridAndExecute();

      expect(entity.targeting!.potentialTargets).toHaveLength(2);
      expect(entity.targeting!.potentialTargets).toContain(firefly);
      expect(entity.targeting!.potentialTargets).toContain(wisp);
    });

    it('should handle empty interactsWith array', () => {
      const entity = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: [] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(entity.targeting!.potentialTargets).toHaveLength(0);
    });
  });

  describe('distance calculations', () => {
    it('should correctly calculate diagonal distances', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        position: { x: 130, y: 140 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
    });

    it('should handle entities at exact radius boundary', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 30, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        position: { x: 130, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
    });
  });

  describe('multiple entities', () => {
    it('should populate potentialTargets for multiple entities simultaneously', () => {
      const firefly1 = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      const firefly2 = world.add({
        position: { x: 200, y: 200 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      const monster1 = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      const monster2 = world.add({
        position: { x: 220, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly1.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly1.targeting!.potentialTargets[0]).toBe(monster1);

      expect(firefly2.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly2.targeting!.potentialTargets[0]).toBe(monster2);
    });

    it('should handle one entity targeting multiple entities', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      const monster1 = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      const monster2 = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      const monster3 = world.add({
        position: { x: 130, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(3);
      expect(firefly.targeting!.potentialTargets).toContain(monster1);
      expect(firefly.targeting!.potentialTargets).toContain(monster2);
      expect(firefly.targeting!.potentialTargets).toContain(monster3);
    });
  });

  describe('edge cases', () => {
    it('should handle entity without Position component on nearby entity', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      expect(() => populateGridAndExecute()).not.toThrow();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should handle zero interaction radius', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 0, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
    });

    it('should handle no entities in world', () => {
      expect(() => populateGridAndExecute()).not.toThrow();
    });

    it('should handle single entity in world', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      expect(() => populateGridAndExecute()).not.toThrow();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });
  });

  describe('spatial grid optimization', () => {
    it('should use spatial grid getNearby instead of checking all entities', () => {
      const firefly = world.add({
        position: { x: 50, y: 50 },
        interaction: { interactionRadius: 30, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      world.add({
        position: { x: 60, y: 60 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      spatialGrid.clear();
      spatialGrid.insert(firefly, 50, 50);

      system.update(16, 16);

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should find entities when they are properly added to spatial grid', () => {
      const firefly = world.add({
        position: { x: 50, y: 50 },
        interaction: { interactionRadius: 30, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        fireflyTag: true
      });

      const monster = world.add({
        position: { x: 60, y: 60 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      spatialGrid.clear();
      spatialGrid.insert(firefly, 50, 50);
      spatialGrid.insert(monster, 60, 60);

      system.update(16, 16);

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(monster);
    });
  });

  describe('canInteractWith helper', () => {
    it('should return true for firefly entities when looking for fireflies', () => {
      const firefly = world.add({
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      expect((system as any).canInteractWith(firefly, ['firefly'])).toBe(true);
    });

    it('should return true for monster entities when looking for monsters', () => {
      const monster = world.add({
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        monsterTag: true
      });

      expect((system as any).canInteractWith(monster, ['monster'])).toBe(true);
    });

    it('should return true for wisp entities when looking for wisps', () => {
      const wisp = world.add({
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        wispTag: true
      });

      expect((system as any).canInteractWith(wisp, ['wisp'])).toBe(true);
    });

    it('should return false when entity type does not match', () => {
      const firefly = world.add({
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      expect((system as any).canInteractWith(firefly, ['monster'])).toBe(false);
    });

    it('should return false for empty interactsWith array', () => {
      const firefly = world.add({
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      expect((system as any).canInteractWith(firefly, [])).toBe(false);
    });

    it('should return true if any type in interactsWith matches', () => {
      const firefly = world.add({
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      expect((system as any).canInteractWith(firefly, ['monster', 'firefly', 'wisp'])).toBe(true);
    });

    it('should return false when entity has no Renderable component', () => {
      const entity = world.add({
        fireflyTag: true
      });

      expect((system as any).canInteractWith(entity, ['firefly'])).toBe(false);
    });
  });

  describe('dead entity filtering', () => {
    it('should not add dead entities to potentialTargets', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 0, maxHealth: 100, isDead: true },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should add living entities to potentialTargets', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      const livingMonster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 50, maxHealth: 100, isDead: false },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(livingMonster);
    });

    it('should filter out dead entities from mixed group', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['monster'] },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      const livingMonster = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 50, maxHealth: 100, isDead: false },
        monsterTag: true
      });

      const deadMonster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 0, maxHealth: 100, isDead: true },
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(livingMonster);
      expect(firefly.targeting!.potentialTargets).not.toContain(deadMonster);
    });

    it('should still add entities without Health component', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50, interactsWith: ['wisp'] },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        wispTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(wisp);
    });
  });
});
