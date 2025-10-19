import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { PulseAttackHandler } from '../PulseAttackHandler';
import { AttackContext } from '../AttackHandler';
import { Combat, CombatState, Position, PhysicsBody, FireflyTag, MonsterTag, WispTag } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { SpatialGrid } from '@/utils';
import { ECSEntity } from '@/types';

describe('PulseAttackHandler', () => {
  let handler: PulseAttackHandler;
  let world: World;
  let spatialGrid: SpatialGrid;
  let attacker: ECSEntity;
  let mockCombat: Combat;

  beforeEach(() => {
    handler = new PulseAttackHandler();
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(PhysicsBody)
      .registerComponent(Combat)
      .registerComponent(FireflyTag)
      .registerComponent(MonsterTag)
      .registerComponent(WispTag);

    spatialGrid = new SpatialGrid(100);

    attacker = world.createEntity();
    attacker.addComponent(Position, { x: 0, y: 0 });
    attacker.addComponent(MonsterTag);

    mockCombat = {
      state: CombatState.ATTACKING,
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
      const target = world.createEntity();
      target.addComponent(Position, { x: 10, y: 0 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(FireflyTag);

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
      const target = world.createEntity();
      target.addComponent(Position, { x: 100, y: 0 }); // Far away
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(FireflyTag);

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
      attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 8 });
      attacker.addComponent(FireflyTag); // Make attacker match target tags

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
  });

  describe('target tag filtering', () => {
    it('should only hit entities matching targetTags', () => {
      const fireflyTarget = world.createEntity();
      fireflyTarget.addComponent(Position, { x: 10, y: 0 });
      fireflyTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      fireflyTarget.addComponent(FireflyTag);

      const monsterTarget = world.createEntity();
      monsterTarget.addComponent(Position, { x: 20, y: 0 });
      monsterTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      monsterTarget.addComponent(MonsterTag);

      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(fireflyTarget, 10, 0);
      spatialGrid.insert(monsterTarget, 20, 0);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat, // targetTags: ['firefly']
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

      const fireflyTarget = world.createEntity();
      fireflyTarget.addComponent(Position, { x: 10, y: 0 });
      fireflyTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      fireflyTarget.addComponent(FireflyTag);

      const wispTarget = world.createEntity();
      wispTarget.addComponent(Position, { x: 15, y: 0 });
      wispTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      wispTarget.addComponent(WispTag);

      const monsterTarget = world.createEntity();
      monsterTarget.addComponent(Position, { x: 20, y: 0 });
      monsterTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      monsterTarget.addComponent(MonsterTag);

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

      const fireflyTarget = world.createEntity();
      fireflyTarget.addComponent(Position, { x: 10, y: 0 });
      fireflyTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      fireflyTarget.addComponent(FireflyTag);

      const monsterTarget = world.createEntity();
      monsterTarget.addComponent(Position, { x: 20, y: 0 });
      monsterTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      monsterTarget.addComponent(MonsterTag);

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
      const nearTarget = world.createEntity();
      nearTarget.addComponent(Position, { x: 10, y: 0 });
      nearTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      nearTarget.addComponent(FireflyTag);

      const farTarget = world.createEntity();
      farTarget.addComponent(Position, { x: 200, y: 0 });
      farTarget.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      farTarget.addComponent(FireflyTag);

      // Only add near target to spatial grid
      spatialGrid.insert(attacker, 0, 0);
      spatialGrid.insert(nearTarget, 10, 0);
      // Intentionally NOT adding farTarget to spatial grid

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      handler.execute(context);

      // Should only hit nearTarget (the one in the grid)
      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target: nearTarget })
      );
    });

    it('should fall back to all entities when spatial grid not provided', () => {
      const target = world.createEntity();
      target.addComponent(Position, { x: 10, y: 0 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(FireflyTag);

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
        // No spatialGrid provided
      };

      handler.execute(context);

      // Should still find and hit the target using world entity iteration
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle attacker without Position component gracefully', () => {
      attacker.removeComponent(Position);

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spatialGrid
      };

      expect(() => handler.execute(context)).not.toThrow();
    });

    it('should skip entities without Position component', () => {
      const target = world.createEntity();
      // No Position component
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(FireflyTag);

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
      const target = world.createEntity();
      target.addComponent(Position, { x: 10, y: 0 });
      // No PhysicsBody component
      target.addComponent(FireflyTag);

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

      const target = world.createEntity();
      target.addComponent(Position, { x: 0, y: 0 }); // Same position as attacker
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(FireflyTag);

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

      // Should hit target at exact same position
      expect(gameEvents.emit).toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.objectContaining({ target })
      );
    });

    it('should handle undefined radius', () => {
      mockCombat.attackPattern.radius = undefined;

      const target = world.createEntity();
      target.addComponent(Position, { x: 10, y: 0 });
      target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
      target.addComponent(FireflyTag);

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
      
      // With radius = 0 (from ?? 0), should not hit anything
      expect(gameEvents.emit).not.toHaveBeenCalledWith(
        GameEvents.ATTACK_HIT,
        expect.anything()
      );
    });
  });
});
