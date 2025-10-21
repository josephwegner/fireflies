import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import { Lodge } from '../Lodge';
import { Renderable } from '@/ecs/components/core';

describe('Lodge Component', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Lodge);
    world.registerComponent(Renderable);
  });

  describe('Component initialization', () => {
    it('should have correct default values', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge);
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.tenants).toEqual([]);
      expect(lodge.allowedTenants).toEqual([]);
      expect(lodge.maxTenants).toBe(2);
    });

    it('should allow custom tenant configuration', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly', 'wisp'],
        maxTenants: 5
      });
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.allowedTenants).toEqual(['firefly', 'wisp']);
      expect(lodge.maxTenants).toBe(5);
      expect(lodge.tenants).toEqual([]);
    });

    it('should allow single allowed tenant type', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly'],
        maxTenants: 1
      });
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.allowedTenants).toEqual(['firefly']);
      expect(lodge.maxTenants).toBe(1);
    });
  });

  describe('Tenant management', () => {
    it('should be mutable for adding tenants', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly'],
        maxTenants: 2
      });
      
      const tenant = world.createEntity();
      tenant.addComponent(Renderable, { type: 'firefly' });
      
      const lodge = entity.getMutableComponent(Lodge)!;
      const tenantRenderable = tenant.getComponent(Renderable)!;
      lodge.tenants.push(tenantRenderable);
      
      expect(lodge.tenants).toHaveLength(1);
      expect(lodge.tenants[0]).toBe(tenantRenderable);
    });

    it('should handle multiple tenants', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly'],
        maxTenants: 3
      });
      
      const tenant1 = world.createEntity();
      tenant1.addComponent(Renderable, { type: 'firefly' });
      
      const tenant2 = world.createEntity();
      tenant2.addComponent(Renderable, { type: 'firefly' });
      
      const lodge = entity.getMutableComponent(Lodge)!;
      lodge.tenants.push(tenant1.getComponent(Renderable)!);
      lodge.tenants.push(tenant2.getComponent(Renderable)!);
      
      expect(lodge.tenants).toHaveLength(2);
    });

    it('should handle empty allowedTenants array', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: [],
        maxTenants: 5
      });
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.allowedTenants).toEqual([]);
    });

    it('should support zero maxTenants', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly'],
        maxTenants: 0
      });
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.maxTenants).toBe(0);
    });
  });

  describe('Component queries', () => {
    it('should be queryable by systems', () => {
      const entity1 = world.createEntity();
      entity1.addComponent(Lodge);
      
      const entity2 = world.createEntity();
      entity2.addComponent(Lodge);
      
      // Systems would query for entities with Lodge component
      expect(entity1.hasComponent(Lodge)).toBe(true);
      expect(entity2.hasComponent(Lodge)).toBe(true);
    });

    it('should differentiate lodges from non-lodges', () => {
      const lodge = world.createEntity();
      lodge.addComponent(Lodge);
      
      const nonLodge = world.createEntity();
      
      expect(lodge.hasComponent(Lodge)).toBe(true);
      expect(nonLodge.hasComponent(Lodge)).toBe(false);
    });
  });

  describe('Configuration validation', () => {
    it('should handle large maxTenants values', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly'],
        maxTenants: 100
      });
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.maxTenants).toBe(100);
    });

    it('should handle multiple allowed tenant types', () => {
      const entity = world.createEntity();
      entity.addComponent(Lodge, {
        allowedTenants: ['firefly', 'wisp', 'monster'],
        maxTenants: 2
      });
      
      const lodge = entity.getComponent(Lodge)!;
      expect(lodge.allowedTenants).toEqual(['firefly', 'wisp', 'monster']);
    });
  });
});