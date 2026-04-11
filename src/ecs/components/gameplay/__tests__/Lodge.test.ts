import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';

describe('Lodge Component', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new World<Entity>();
  });

  describe('Component initialization', () => {
    it('should store lodge values', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: [],
          maxTenants: 2
        }
      });

      expect(entity.lodge!.tenants).toEqual([]);
      expect(entity.lodge!.allowedTenants).toEqual([]);
      expect(entity.lodge!.maxTenants).toBe(2);
    });

    it('should allow custom tenant configuration', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly', 'wisp'],
          maxTenants: 5
        }
      });

      expect(entity.lodge!.allowedTenants).toEqual(['firefly', 'wisp']);
      expect(entity.lodge!.maxTenants).toBe(5);
      expect(entity.lodge!.tenants).toEqual([]);
    });

    it('should allow single allowed tenant type', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly'],
          maxTenants: 1
        }
      });

      expect(entity.lodge!.allowedTenants).toEqual(['firefly']);
      expect(entity.lodge!.maxTenants).toBe(1);
    });
  });

  describe('Tenant management', () => {
    it('should be mutable for adding tenants', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly'],
          maxTenants: 2
        }
      });

      const tenant = world.add({
        renderable: {
          type: 'firefly',
          color: 0xffff00,
          radius: 4,
          alpha: 1,
          scale: 1,
          tint: 0xFFFFFF,
          rotation: 0,
          rotationSpeed: 0,
          depth: 50,
          offsetY: 0
        }
      });

      entity.lodge!.tenants.push(tenant);

      expect(entity.lodge!.tenants).toHaveLength(1);
      expect(entity.lodge!.tenants[0]).toBe(tenant);
    });

    it('should handle multiple tenants', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly'],
          maxTenants: 3
        }
      });

      const tenant1 = world.add({ fireflyTag: true });
      const tenant2 = world.add({ fireflyTag: true });

      entity.lodge!.tenants.push(tenant1);
      entity.lodge!.tenants.push(tenant2);

      expect(entity.lodge!.tenants).toHaveLength(2);
    });

    it('should handle empty allowedTenants array', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: [],
          maxTenants: 5
        }
      });

      expect(entity.lodge!.allowedTenants).toEqual([]);
    });

    it('should support zero maxTenants', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly'],
          maxTenants: 0
        }
      });

      expect(entity.lodge!.maxTenants).toBe(0);
    });
  });

  describe('Component queries', () => {
    it('should be queryable by systems', () => {
      const entity1 = world.add({
        lodge: { tenants: [], allowedTenants: [], maxTenants: 2 }
      });

      const entity2 = world.add({
        lodge: { tenants: [], allowedTenants: [], maxTenants: 2 }
      });

      expect(!!entity1.lodge).toBe(true);
      expect(!!entity2.lodge).toBe(true);
    });

    it('should differentiate lodges from non-lodges', () => {
      const lodge = world.add({
        lodge: { tenants: [], allowedTenants: [], maxTenants: 2 }
      });

      const nonLodge = world.add({
        position: { x: 0, y: 0 }
      });

      expect(!!lodge.lodge).toBe(true);
      expect(!!nonLodge.lodge).toBe(false);
    });
  });

  describe('Configuration validation', () => {
    it('should handle large maxTenants values', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly'],
          maxTenants: 100
        }
      });

      expect(entity.lodge!.maxTenants).toBe(100);
    });

    it('should handle multiple allowed tenant types', () => {
      const entity = world.add({
        lodge: {
          tenants: [],
          allowedTenants: ['firefly', 'wisp', 'monster'],
          maxTenants: 2
        }
      });

      expect(entity.lodge!.allowedTenants).toEqual(['firefly', 'wisp', 'monster']);
    });
  });
});
