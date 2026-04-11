import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { VictorySystem } from '../VictorySystem';
import { gameEvents, GameEvents } from '@/events';

describe('VictorySystem', () => {
  let world: GameWorld;
  let system: VictorySystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    system = new VictorySystem(world, {});
  });

  function createMonster(isDead = false): Entity {
    return world.add({
      monsterTag: true,
      health: { currentHealth: isDead ? 0 : 50, maxHealth: 50, isDead }
    });
  }

  function createLodgeWithFirefly(): { lodge: Entity; firefly: Entity } {
    const firefly = world.add({
      fireflyTag: true,
      renderable: {
        type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 4,
        alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0,
        depth: 50, offsetY: 0
      }
    });

    const lodge = world.add({
      lodge: { tenants: [firefly], allowedTenants: ['firefly'], maxTenants: 1 },
      position: { x: 100, y: 100 }
    });

    return { lodge, firefly };
  }

  describe('victory detection', () => {
    it('should not trigger victory when living monsters remain', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, listener);

      createMonster(false);
      createMonster(true);

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should trigger victory when all monsters are dead', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, listener);

      createMonster(true);
      createMonster(true);

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(listener).toHaveBeenCalledOnce();
    });

    it('should not trigger victory when there are no monsters', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, listener);

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should only trigger victory once', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, listener);

      createMonster(true);

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });
      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('firefly eviction', () => {
    it('should evict fireflies from lodges on victory', () => {
      createMonster(true);
      const { lodge, firefly } = createLodgeWithFirefly();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(lodge.lodge!.tenants).toHaveLength(0);
      expect(firefly.position).toBeDefined();
      expect(firefly.velocity).toBeDefined();
      expect(firefly.path).toBeDefined();
      expect(firefly.fleeingToGoalTag).toBe(true);
    });

    it('should set evicted firefly position to lodge position', () => {
      createMonster(true);
      const { firefly } = createLodgeWithFirefly();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(firefly.position!.x).toBe(100);
      expect(firefly.position!.y).toBe(100);
    });

    it('should skip non-firefly tenants', () => {
      createMonster(true);

      const wisp = world.add({ wispTag: true, renderable: {
        type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 12,
        alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0,
        depth: 40, offsetY: 0
      }});

      const lodge = world.add({
        lodge: { tenants: [wisp], allowedTenants: ['wisp'], maxTenants: 1 },
        position: { x: 100, y: 100 }
      });

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(lodge.lodge!.tenants).toHaveLength(1);
    });

    it('should handle tenants that have been removed from the world', () => {
      createMonster(true);
      const { lodge, firefly } = createLodgeWithFirefly();

      world.remove(firefly);

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(lodge.lodge!.tenants).toHaveLength(0);
    });

    it('should skip tenants without a renderable type', () => {
      createMonster(true);

      const bareFirefly = world.add({ fireflyTag: true });
      const lodge = world.add({
        lodge: { tenants: [bareFirefly], allowedTenants: ['firefly'], maxTenants: 1 },
        position: { x: 100, y: 100 }
      });

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(lodge.lodge!.tenants).toHaveLength(0);
      expect(bareFirefly.position).toBeUndefined();
    });

    it('should evict from multiple lodges', () => {
      createMonster(true);
      const lodge1 = createLodgeWithFirefly();
      const lodge2 = createLodgeWithFirefly();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(lodge1.lodge.lodge!.tenants).toHaveLength(0);
      expect(lodge2.lodge.lodge!.tenants).toHaveLength(0);
      expect(lodge1.firefly.fleeingToGoalTag).toBe(true);
      expect(lodge2.firefly.fleeingToGoalTag).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from events on destroy', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, listener);

      createMonster(true);
      system.destroy();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 }
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
