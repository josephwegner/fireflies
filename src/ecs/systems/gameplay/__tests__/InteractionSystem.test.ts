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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const monster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(monster);
    });

    it('should not add entities outside interaction radius', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 30 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 150, y: 100 },
        team: 'monster',
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should clear potentialTargets each frame', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const monster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });
  });

  describe('team-based filtering', () => {
    it('should only add entities on different teams', () => {
      const monster = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'monster',
        monsterTag: true
      });

      const firefly = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 115, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'monster',
        wispTag: true
      });

      populateGridAndExecute();

      expect(monster.targeting!.potentialTargets).toHaveLength(1);
      expect(monster.targeting!.potentialTargets[0]).toBe(firefly);
    });

    it('should add any entity on an enemy team', () => {
      const entity = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'monster',
        monsterTag: true
      });

      const firefly = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        wispTag: true
      });

      populateGridAndExecute();

      expect(entity.targeting!.potentialTargets).toHaveLength(2);
      expect(entity.targeting!.potentialTargets).toContain(firefly);
      expect(entity.targeting!.potentialTargets).toContain(wisp);
    });

    it('should not add entities without a team', () => {
      const entity = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 130, y: 140 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
    });

    it('should handle entities at exact radius boundary', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 30 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 130, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      const firefly2 = world.add({
        position: { x: 200, y: 200 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      const monster1 = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
        monsterTag: true
      });

      const monster2 = world.add({
        position: { x: 220, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      const monster1 = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
        monsterTag: true
      });

      const monster2 = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
        monsterTag: true
      });

      const monster3 = world.add({
        position: { x: 130, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
        monsterTag: true
      });

      expect(() => populateGridAndExecute()).not.toThrow();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should handle zero interaction radius', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 0 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
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
        interaction: { interactionRadius: 30 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 60, y: 60 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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
        interaction: { interactionRadius: 30 },
        targeting: { potentialTargets: [] },
        team: 'firefly',
        fireflyTag: true
      });

      const monster = world.add({
        position: { x: 60, y: 60 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        team: 'monster',
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

  describe('isEnemy helper', () => {
    it('should return true when teams are different', () => {
      expect((system as any).isEnemy('firefly', 'monster')).toBe(true);
    });

    it('should return false when teams are the same', () => {
      expect((system as any).isEnemy('firefly', 'firefly')).toBe(false);
    });

    it('should return false when source team is undefined', () => {
      expect((system as any).isEnemy(undefined, 'monster')).toBe(false);
    });

    it('should return false when target team is undefined', () => {
      expect((system as any).isEnemy('firefly', undefined)).toBe(false);
    });

    it('should return false when both teams are undefined', () => {
      expect((system as any).isEnemy(undefined, undefined)).toBe(false);
    });
  });

  describe('dead entity filtering', () => {
    it('should not add dead entities to potentialTargets', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 0, maxHealth: 100, isDead: true },
        team: 'monster',
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(0);
    });

    it('should add living entities to potentialTargets', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const livingMonster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 50, maxHealth: 100, isDead: false },
        team: 'monster',
        monsterTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(livingMonster);
    });

    it('should filter out dead entities from mixed group', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const livingMonster = world.add({
        position: { x: 110, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 50, maxHealth: 100, isDead: false },
        team: 'monster',
        monsterTag: true
      });

      const deadMonster = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        },
        health: { currentHealth: 0, maxHealth: 100, isDead: true },
        team: 'monster',
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
        interaction: { interactionRadius: 50 },
        targeting: { potentialTargets: [] },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'monster',
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 120, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        wispTag: true
      });

      populateGridAndExecute();

      expect(firefly.targeting!.potentialTargets).toHaveLength(1);
      expect(firefly.targeting!.potentialTargets[0]).toBe(wisp);
    });
  });
});
