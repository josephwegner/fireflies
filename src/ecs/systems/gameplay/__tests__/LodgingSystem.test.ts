import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'ecsy';
import { LodgingSystem } from '../LodgingSystem';
import {
  Position,
  Velocity,
  Path,
  Lodge,
  Renderable,
  FireflyTag,
  WispTag
} from '@/ecs/components';
import { SpatialGrid } from '@/utils';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG, ENTITY_CONFIG } from '@/config';

describe('LodgingSystem', () => {
  let world: World;
  let system: LodgingSystem;
  let spatialGrid: SpatialGrid;

  beforeEach(() => {
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Velocity)
      .registerComponent(Path)
      .registerComponent(Lodge)
      .registerComponent(Renderable)
      .registerComponent(FireflyTag)
      .registerComponent(WispTag);

    spatialGrid = new SpatialGrid(100);
    world.registerSystem(LodgingSystem, { spatialGrid });
    system = world.getSystem(LodgingSystem) as LodgingSystem;
  });

  afterEach(() => {
    gameEvents.clear();
  });

  // Populate spatial grid with all entities
  const populateGridAndExecute = () => {
    spatialGrid.clear();
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

  describe('Tenant detection and addition', () => {
    it('should add firefly tenant when within range of wisp lodge', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(1);
    });

    it('should not add tenant when outside arrival threshold', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      // Position far away
      firefly
        .addComponent(Position, { x: 200, y: 200 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(0);
    });

    it('should not add tenant when lodge is at max capacity', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly1 = world.createEntity();
      firefly1
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      const firefly2 = world.createEntity();
      firefly2
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      // Only one tenant should be added
      expect(lodge.tenants).toHaveLength(1);
    });

    it('should not add tenant of disallowed type', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['monster'], // Only monsters allowed
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(0);
    });

    it('should not add lodge entity as its own tenant', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['wisp'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(0);
    });
  });

  describe('canLodge helper', () => {
    it('should return true for allowed tenant type', () => {
      const firefly = world.createEntity();
      firefly.addComponent(Renderable, { type: 'firefly' });

      expect(system.canLodge(firefly, ['firefly'])).toBe(true);
    });

    it('should return false for disallowed tenant type', () => {
      const firefly = world.createEntity();
      firefly.addComponent(Renderable, { type: 'firefly' });

      expect(system.canLodge(firefly, ['monster'])).toBe(false);
    });

    it('should return true if tenant type is in multiple allowed types', () => {
      const firefly = world.createEntity();
      firefly.addComponent(Renderable, { type: 'firefly' });

      expect(system.canLodge(firefly, ['monster', 'firefly', 'wisp'])).toBe(true);
    });

    it('should return false for entity without Renderable component', () => {
      const entity = world.createEntity();

      expect(system.canLodge(entity, ['firefly'])).toBe(false);
    });

    it('should return false for empty allowedTenants array', () => {
      const firefly = world.createEntity();
      firefly.addComponent(Renderable, { type: 'firefly' });

      expect(system.canLodge(firefly, [])).toBe(false);
    });
  });

  describe('Event handling', () => {
    it('should emit TENANT_ADDED_TO_LODGE event when tenant is added', () => {
      const eventSpy = vi.fn();
      gameEvents.on(GameEvents.TENANT_ADDED_TO_LODGE, eventSpy);

      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({
        lodgeEntity: wisp,
        tenantEntity: firefly
      });
    });

    it('should remove Position, Velocity, and Path components from tenant', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 5, vy: 5 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      expect(firefly.hasComponent(Position)).toBe(false);
      expect(firefly.hasComponent(Velocity)).toBe(false);
      expect(firefly.hasComponent(Path)).toBe(false);
    });

    it('should change lodge color to activeColor when full', () => {
      const wisp = world.createEntity();
      const wispRenderable = wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp', tint: ENTITY_CONFIG.wisp.color })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag)
        .getMutableComponent(Renderable)!;

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      // Color should change to activeColor when lodge is full
      expect(wispRenderable.tint).toBe(ENTITY_CONFIG.wisp.activeColor);
    });

    it('should not change color when lodge is not yet full', () => {
      const wisp = world.createEntity();
      const originalColor = ENTITY_CONFIG.wisp.color;
      const wispRenderable = wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp', tint: originalColor })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 2 // Can hold 2, will only add 1
        })
        .addComponent(WispTag)
        .getMutableComponent(Renderable)!;

      const firefly = world.createEntity();
      firefly
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      // Color should NOT change yet since lodge isn't full
      expect(wispRenderable.tint).toBe(originalColor);
    });
  });

  describe('Distance calculations', () => {
    it('should respect PATH_ARRIVAL_THRESHOLD for lodging', () => {
      const threshold = PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD;
      
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      // Position exactly at threshold boundary
      firefly
        .addComponent(Position, { x: 100 + threshold, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(1);
    });

    it('should handle diagonal distances correctly', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly = world.createEntity();
      // Position at diagonal, within threshold
      const offset = PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD / Math.sqrt(2) - 0.1;
      firefly
        .addComponent(Position, { x: 100 + offset, y: 100 + offset })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(1);
    });
  });

  describe('Multiple lodges', () => {
    it('should handle multiple lodges independently', () => {
      const wisp1 = world.createEntity();
      wisp1
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const wisp2 = world.createEntity();
      wisp2
        .addComponent(Position, { x: 200, y: 200 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const firefly1 = world.createEntity();
      firefly1
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      const firefly2 = world.createEntity();
      firefly2
        .addComponent(Position, { x: 200, y: 200 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge1 = wisp1.getComponent(Lodge)!;
      const lodge2 = wisp2.getComponent(Lodge)!;
      
      expect(lodge1.tenants).toHaveLength(1);
      expect(lodge2.tenants).toHaveLength(1);
    });

    it('should allow lodge with multiple tenant capacity', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 3
        })
        .addComponent(WispTag);

      const firefly1 = world.createEntity();
      firefly1
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      const firefly2 = world.createEntity();
      firefly2
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' })
        .addComponent(Renderable, { type: 'firefly' })
        .addComponent(FireflyTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle lodge without Position component gracefully', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      expect(() => populateGridAndExecute()).not.toThrow();
    });

    it('should handle tenant without Renderable component', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      const entity = world.createEntity();
      entity
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Velocity, { vx: 0, vy: 0 })
        .addComponent(Path, { currentPath: [], nextPath: [], direction: 'r' });

      expect(() => populateGridAndExecute()).not.toThrow();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(0);
    });

    it('should handle no lodges in world', () => {
      expect(() => populateGridAndExecute()).not.toThrow();
    });

    it('should handle no tenants near lodge', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      populateGridAndExecute();

      const lodge = wisp.getComponent(Lodge)!;
      expect(lodge.tenants).toHaveLength(0);
    });

    it('should not crash when spatial grid is empty', () => {
      const wisp = world.createEntity();
      wisp
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        })
        .addComponent(WispTag);

      spatialGrid.clear();
      // Don't populate grid, leave it empty
      
      expect(() => system.execute()).not.toThrow();
    });
  });

  describe('System queries', () => {
    it('should only process entities with Lodge and Position components', () => {
      const wisp1 = world.createEntity();
      wisp1
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        });

      const wisp2 = world.createEntity();
      wisp2
        .addComponent(Renderable, { type: 'wisp' })
        .addComponent(Lodge, {
          allowedTenants: ['firefly'],
          maxTenants: 1
        }); // Missing Position

      const wisp3 = world.createEntity();
      wisp3
        .addComponent(Position, { x: 100, y: 100 })
        .addComponent(Renderable, { type: 'wisp' }); // Missing Lodge

      expect(() => populateGridAndExecute()).not.toThrow();
    });
  });
});