import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { LodgingSystem } from '../LodgingSystem';
import { SpatialGrid } from '@/utils';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG, ENTITY_CONFIG } from '@/config';
import { populateGridAndExecute } from '@/__tests__/helpers';

describe('LodgingSystem', () => {
  let world: GameWorld;
  let system: LodgingSystem;
  let spatialGrid: SpatialGrid;

  beforeEach(() => {
    world = new World<Entity>();
    spatialGrid = new SpatialGrid(100);
    gameEvents.clear();
    system = new LodgingSystem(world, { spatialGrid });
  });

  afterEach(() => {
    gameEvents.clear();
  });

  const runLodging = () => {
    populateGridAndExecute(world, spatialGrid, system);
  };

  describe('Tenant detection and addition', () => {
    it('should add firefly tenant when within range of wisp lodge', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });

    it('should not add tenant when outside arrival threshold', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 200, y: 200 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not add tenant when lodge is at max capacity', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });

    it('should not add tenant of mismatched team', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'monster', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not add lodge entity as its own tenant', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });
  });

  describe('canLodge helper', () => {
    it('should return true for matching team', () => {
      const firefly = world.add({
        team: 'firefly',
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect((system as any).canLodge(firefly, 'firefly')).toBe(true);
    });

    it('should return false for mismatched team', () => {
      const firefly = world.add({
        team: 'firefly',
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect((system as any).canLodge(firefly, 'monster')).toBe(false);
    });

    it('should return false for entity without team', () => {
      const entity = world.add({
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect((system as any).canLodge(entity, 'firefly')).toBe(false);
    });

    it('should return false for entity with FleeingToGoalTag', () => {
      const firefly = world.add({
        team: 'firefly',
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fleeingToGoalTag: true
      });

      expect((system as any).canLodge(firefly, 'firefly')).toBe(false);
    });
  });

  describe('Event handling', () => {
    it('should emit TENANT_ADDED_TO_LODGE event when tenant is added', () => {
      const eventSpy = vi.fn();
      gameEvents.on(GameEvents.TENANT_ADDED_TO_LODGE, eventSpy);

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const firefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({
        lodgeEntity: wisp,
        tenantEntity: firefly
      });
    });

    it('should remove Position, Velocity, and Path components from tenant', () => {
      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const firefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 5, vy: 5 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(firefly.position).toBeUndefined();
      expect(firefly.velocity).toBeUndefined();
      expect(firefly.path).toBeUndefined();
    });

    it('should change lodge color to activeColor when full', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: ENTITY_CONFIG.wisp.color, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        activationConfig: {
          onActivate: [
            { componentName: 'renderable', config: { tint: ENTITY_CONFIG.wisp.activeColor } }
          ],
          onDeactivate: [
            { componentName: 'renderable', config: { tint: ENTITY_CONFIG.wisp.color } }
          ]
        },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.renderable!.tint).toBe(ENTITY_CONFIG.wisp.activeColor);
    });

    it('should not change color when lodge is not yet full', () => {
      const originalColor = ENTITY_CONFIG.wisp.color;

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: originalColor, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.renderable!.tint).toBe(originalColor);
    });
  });

  describe('Distance calculations', () => {
    it('should respect PATH_ARRIVAL_THRESHOLD for lodging', () => {
      const threshold = PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD;

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100 + threshold, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });

    it('should handle diagonal distances correctly', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const offset = PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD / Math.sqrt(2) - 0.1;
      world.add({
        position: { x: 100 + offset, y: 100 + offset },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });
  });

  describe('Multiple lodges', () => {
    it('should handle multiple lodges independently', () => {
      const wisp1 = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const wisp2 = world.add({
        position: { x: 200, y: 200 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 200, y: 200 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp1.lodge!.tenants).toHaveLength(1);
      expect(wisp2.lodge!.tenants).toHaveLength(1);
    });

    it('should allow lodge with multiple tenant capacity', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 3, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(2);
    });
  });

  describe('Incoming management', () => {
    it('should move arriving entity from incoming to tenants', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        assignedDestination: undefined as any,
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      runLodging();

      expect(wisp.lodge!.tenants).toContain(firefly);
      expect(wisp.lodge!.incoming).not.toContain(firefly);
    });

    it('should remove assignedDestination from tenant on arrival', () => {
      const firefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      world.addComponent(firefly, 'assignedDestination', { target: wisp });

      runLodging();

      expect(firefly.assignedDestination).toBeUndefined();
    });

    it('should clean dead entities from incoming', () => {
      const firefly = world.add({
        position: { x: 500, y: 500 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        health: { currentHealth: 0, maxHealth: 50, isDead: true },
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      runLodging();

      expect(wisp.lodge!.incoming).toHaveLength(0);
    });

    it('should clean removed entities from incoming', () => {
      const firefly = world.add({
        position: { x: 500, y: 500 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      world.remove(firefly);

      runLodging();

      expect(wisp.lodge!.incoming).toHaveLength(0);
    });

    it('should count incoming toward capacity', () => {
      const incomingFirefly = world.add({
        position: { x: 500, y: 500 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [{ x: 100, y: 100 }], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const nearbyFirefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [incomingFirefly] },
        wispTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
      expect(wisp.lodge!.incoming).toContain(incomingFirefly);
    });

    it('should free capacity slot when incoming entity dies, allowing new tenant', () => {
      const deadFirefly = world.add({
        position: { x: 500, y: 500 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        health: { currentHealth: 0, maxHealth: 50, isDead: true },
        fireflyTag: true
      });

      const nearbyFirefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [deadFirefly] },
        wispTag: true
      });

      runLodging();

      expect(wisp.lodge!.incoming).toHaveLength(0);
      expect(wisp.lodge!.tenants).toHaveLength(1);
      expect(wisp.lodge!.tenants[0]).toBe(nearbyFirefly);
    });
  });

  describe('Edge cases', () => {
    it('should handle lodge without Position component gracefully', () => {
      world.add({
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      expect(() => runLodging()).not.toThrow();
    });

    it('should handle tenant without Renderable component', () => {
      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' }
      });

      expect(() => runLodging()).not.toThrow();
    });

    it('should handle no lodges in world', () => {
      expect(() => runLodging()).not.toThrow();
    });

    it('should handle no tenants near lodge', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not crash when spatial grid is empty', () => {
      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      spatialGrid.clear();

      expect(() => system.update(16, 16)).not.toThrow();
    });

    it('should not allow lodging for entities fleeing to goal', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true,
        fleeingToGoalTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not lodge fleeing entities even if they are the right type and within range', () => {
      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [], incoming: [] },
        wispTag: true
      });

      const normalFirefly = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true
      });

      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        path: { currentPath: [], goalPath: [], direction: 'r' },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        team: 'firefly',
        fireflyTag: true,
        fleeingToGoalTag: true
      });

      runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
      expect(wisp.lodge!.tenants[0]).toBe(normalFirefly);
    });
  });

  describe('System queries', () => {
    it('should only process entities with Lodge and Position components', () => {
      world.add({
        position: { x: 100, y: 100 },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] }
      });

      world.add({
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] }
      });

      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect(() => runLodging()).not.toThrow();
    });
  });
});
