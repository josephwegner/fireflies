import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld, Combat, CombatState } from '@/ecs/Entity';
import { PulseAttackHandler } from '../PulseAttackHandler';
import type { AttackContext } from '../AttackHandler';
import { gameEvents, GameEvents } from '@/events';
import { SpatialGrid } from '@/utils';

describe('PulseAttackHandler', () => {
  let handler: PulseAttackHandler;
  let world: GameWorld;
  let spatialGrid: SpatialGrid;
  let attacker: Entity;
  let mockCombat: Combat;

  beforeEach(() => {
    handler = new PulseAttackHandler();
    world = new World<Entity>();
    spatialGrid = new SpatialGrid(100);

    attacker = world.add({
      position: { x: 0, y: 0 },
      monsterTag: true
    });

    mockCombat = {
      state: 'ATTACKING' as CombatState,
      chargeTime: 1000,
      attackElapsed: 0,
      recoveryElapsed: 0,
      hasHit: false,
      attackPattern: {
        handlerType: 'pulse',
        chargeTime: 1000,
        attackDuration: 100,
        recoveryTime: 0,
        damage: 25,
        knockbackForce: 30,
        radius: 50,
        targetTags: ['firefly']
      }
    };

    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should hit entities within radius', () => {
      const target = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25,
        knockbackForce: 30
      });
    });

    it('should not hit entities outside radius', () => {
      const target = world.add({
        position: { x: 100, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 100, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });

    it('should not hit self', () => {
      world.addComponent(attacker, 'physicsBody', { mass: 1, isStatic: false, collisionRadius: 8 });
      world.addComponent(attacker, 'fireflyTag', true);

      spatialGrid.insert(attacker, 0, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });

    it('should account for target collisionRadius in hit range', () => {
      // Place target at exactly pulse radius (50). Without target's collisionRadius,
      // the check is distance(50) <= radius(50) which is borderline true.
      // With a large collisionRadius it becomes 50 <= 50 + 45 = 95, clearly true.
      // The real test: place entity just beyond pulse radius but within getNearby range.
      // Since getNearby pre-filters at pulse radius, we use a custom spatial grid
      // with a large cell size so the entity is still returned.
      const wideGrid = new SpatialGrid(200);
      const target = world.add({
        position: { x: 50, y: 0 },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 },
        fireflyTag: true
      });

      wideGrid.insert(attacker, 0, 0);
      wideGrid.insert(target, 50, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid: wideGrid
      };

      handler.execute(context);

      // distance(50) <= radius(50) + targetRadius(45) = 95 → hit
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25,
        knockbackForce: 30
      });
    });

    it('should set hasHit flag after execution', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(mockCombat.hasHit).toBe(true);
    });

    it('should only hit targets once even when execute is called multiple times', () => {
      const target = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25,
        knockbackForce: 30
      });
      expect(mockCombat.hasHit).toBe(true);

      handler.execute(context);
      handler.execute(context);
      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('target tag filtering', () => {
    it('should only hit entities matching targetTags', () => {
      const fireflyTarget = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      const monsterTarget = world.add({
        position: { x: 20, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        monsterTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(fireflyTarget, 10, 0);
      spatialGrid.insert(monsterTarget, 20, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: fireflyTarget })
      );
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: monsterTarget })
      );
    });

    it('should hit multiple entities with different matching tags', () => {
      mockCombat.attackPattern.targetTags = ['firefly', 'wisp'];

      const fireflyTarget = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      const wispTarget = world.add({
        position: { x: 15, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        wispTag: true
      });

      const monsterTarget = world.add({
        position: { x: 20, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        monsterTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(fireflyTarget, 10, 0);
      spatialGrid.insert(wispTarget, 15, 0);
      spatialGrid.insert(monsterTarget, 20, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(2);
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: fireflyTarget })
      );
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: wispTarget })
      );
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: monsterTarget })
      );
    });

    it('should hit all entities when targetTags is empty', () => {
      mockCombat.attackPattern.targetTags = [];

      const fireflyTarget = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      const monsterTarget = world.add({
        position: { x: 20, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        monsterTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(fireflyTarget, 10, 0);
      spatialGrid.insert(monsterTarget, 20, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('spatial grid optimization', () => {
    it('should use spatial grid when provided', () => {
      const nearTarget = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      const farTarget = world.add({
        position: { x: 200, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(nearTarget, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: nearTarget })
      );
    });

    it('should return empty results when spatial grid not provided', () => {
      world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      handler.execute(context);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });
  });

  describe('edge cases', () => {
    it('should handle attacker without Position component gracefully', () => {
      const noPositionAttacker = world.add({ monsterTag: true });

      const context: AttackContext = {
        attacker: noPositionAttacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      expect(() => handler.execute(context)).not.toThrow();
    });

    it('should skip entities without Position component', () => {
      const target = world.add({
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });

    it('should skip entities without PhysicsBody component', () => {
      const target = world.add({
        position: { x: 10, y: 0 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });

    it('should handle zero radius', () => {
      mockCombat.attackPattern.radius = 0;

      const target = world.add({
        position: { x: 0, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 0, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target })
      );
    });

    it('should handle undefined radius', () => {
      mockCombat.attackPattern.radius = undefined;

      const target = world.add({
        position: { x: 10, y: 0 },
        physicsBody: { mass: 1, isStatic: false, collisionRadius: 5 },
        fireflyTag: true
      });

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(target, 10, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      expect(() => handler.execute(context)).not.toThrow();

      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });
  });

  describe('No-op Visual Methods', () => {
    it('should not throw on onRecovering', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      expect(() => handler.onRecovering?.(context)).not.toThrow();
    });

    it('should not throw on cleanup', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      expect(() => handler.cleanup?.(context)).not.toThrow();
    });
  });
});
