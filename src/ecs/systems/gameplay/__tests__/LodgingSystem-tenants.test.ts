import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { gameEvents, GameEvents } from '@/events';
import { ENTITY_CONFIG } from '@/config';
import { createLodgingTestSetup, type LodgingTestSetup } from './LodgingSystem-helpers';

describe('LodgingSystem — tenants', () => {
  let t: LodgingTestSetup;

  beforeEach(() => {
    t = createLodgingTestSetup();
  });

  afterEach(() => {
    gameEvents.clear();
  });

  describe('Tenant detection and addition', () => {
    it('should add firefly tenant when within range of wisp lodge', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      t.world.add({
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

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });

    it('should not add tenant when outside arrival threshold', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      t.world.add({
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

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not add tenant when lodge is at max capacity', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      t.world.add({
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

      t.world.add({
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

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });

    it('should not add tenant of mismatched team', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'monster', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      t.world.add({
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

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not add lodge entity as its own tenant', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });
  });

  describe('canLodge helper', () => {
    it('should return true for matching team', () => {
      const firefly = t.world.add({
        team: 'firefly',
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect((t.system as any).canLodge(firefly, 'firefly')).toBe(true);
    });

    it('should return false for mismatched team', () => {
      const firefly = t.world.add({
        team: 'firefly',
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect((t.system as any).canLodge(firefly, 'monster')).toBe(false);
    });

    it('should return false for entity without team', () => {
      const entity = t.world.add({
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect((t.system as any).canLodge(entity, 'firefly')).toBe(false);
    });

    it('should return false for entity with FleeingToGoalTag', () => {
      const firefly = t.world.add({
        team: 'firefly',
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        fleeingToGoalTag: true
      });

      expect((t.system as any).canLodge(firefly, 'firefly')).toBe(false);
    });
  });

  describe('Event handling', () => {
    it('should emit TENANT_ADDED_TO_LODGE event when tenant is added', () => {
      const eventSpy = vi.fn();
      gameEvents.on(GameEvents.TENANT_ADDED_TO_LODGE, eventSpy);

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const firefly = t.world.add({
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

      t.runLodging();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({
        lodgeEntity: wisp,
        tenantEntity: firefly
      });
    });

    it('should remove Position, Velocity, and Path components from tenant', () => {
      t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const firefly = t.world.add({
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

      t.runLodging();

      expect(firefly.position).toBeUndefined();
      expect(firefly.velocity).toBeUndefined();
      expect(firefly.path).toBeUndefined();
    });

    it('should change lodge color to activeColor when full', () => {
      const wisp = t.world.add({
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

      t.world.add({
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

      t.runLodging();

      expect(wisp.renderable!.tint).toBe(ENTITY_CONFIG.wisp.activeColor);
    });

    it('should not change color when lodge is not yet full', () => {
      const originalColor = ENTITY_CONFIG.wisp.color;

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: originalColor, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [], incoming: [] },
        wispTag: true
      });

      t.world.add({
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

      t.runLodging();

      expect(wisp.renderable!.tint).toBe(originalColor);
    });
  });

  describe('Incoming management', () => {
    it('should move arriving entity from incoming to tenants', () => {
      const firefly = t.world.add({
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

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      t.world.addComponent(firefly, 'assignedDestination', { target: wisp });

      t.runLodging();

      expect(wisp.lodge!.tenants).toContain(firefly);
      expect(wisp.lodge!.incoming).not.toContain(firefly);
    });

    it('should remove assignedDestination from tenant on arrival', () => {
      const firefly = t.world.add({
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

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      t.world.addComponent(firefly, 'assignedDestination', { target: wisp });

      t.runLodging();

      expect(firefly.assignedDestination).toBeUndefined();
    });

    it('should clean dead entities from incoming', () => {
      const firefly = t.world.add({
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

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      t.runLodging();

      expect(wisp.lodge!.incoming).toHaveLength(0);
    });

    it('should clean removed entities from incoming', () => {
      const firefly = t.world.add({
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

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [firefly] },
        wispTag: true
      });

      t.world.remove(firefly);

      t.runLodging();

      expect(wisp.lodge!.incoming).toHaveLength(0);
    });

    it('should count incoming toward capacity', () => {
      const incomingFirefly = t.world.add({
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

      const nearbyFirefly = t.world.add({
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

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [incomingFirefly] },
        wispTag: true
      });

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
      expect(wisp.lodge!.incoming).toContain(incomingFirefly);
    });

    it('should free capacity slot when incoming entity dies, allowing new tenant', () => {
      const deadFirefly = t.world.add({
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

      const nearbyFirefly = t.world.add({
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

      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [deadFirefly] },
        wispTag: true
      });

      t.runLodging();

      expect(wisp.lodge!.incoming).toHaveLength(0);
      expect(wisp.lodge!.tenants).toHaveLength(1);
      expect(wisp.lodge!.tenants[0]).toBe(nearbyFirefly);
    });
  });
});
