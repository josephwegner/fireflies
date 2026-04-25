import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';
import { createLodgingTestSetup, type LodgingTestSetup } from './LodgingSystem-helpers';

describe('LodgingSystem — capacity', () => {
  let t: LodgingTestSetup;

  beforeEach(() => {
    t = createLodgingTestSetup();
  });

  afterEach(() => {
    gameEvents.clear();
  });

  describe('Distance calculations', () => {
    it('should respect PATH_ARRIVAL_THRESHOLD for lodging', () => {
      const threshold = PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD;

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

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });

    it('should handle diagonal distances correctly', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const offset = PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD / Math.sqrt(2) - 0.1;
      t.world.add({
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

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
    });
  });

  describe('Multiple lodges', () => {
    it('should handle multiple lodges independently', () => {
      const wisp1 = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      const wisp2 = t.world.add({
        position: { x: 200, y: 200 },
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

      expect(wisp1.lodge!.tenants).toHaveLength(1);
      expect(wisp2.lodge!.tenants).toHaveLength(1);
    });

    it('should allow lodge with multiple tenant capacity', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 3, tenants: [], incoming: [] },
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

      expect(wisp.lodge!.tenants).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle lodge without Position component gracefully', () => {
      t.world.add({
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      expect(() => t.runLodging()).not.toThrow();
    });

    it('should handle tenant without Renderable component', () => {
      t.world.add({
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
        path: { currentPath: [], goalPath: [], direction: 'r' }
      });

      expect(() => t.runLodging()).not.toThrow();
    });

    it('should handle no lodges in world', () => {
      expect(() => t.runLodging()).not.toThrow();
    });

    it('should handle no tenants near lodge', () => {
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

    it('should not crash when spatial grid is empty', () => {
      t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] },
        wispTag: true
      });

      t.spatialGrid.clear();

      expect(() => t.system.update(16, 16)).not.toThrow();
    });

    it('should not allow lodging for entities fleeing to goal', () => {
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
        fireflyTag: true,
        fleeingToGoalTag: true
      });

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should not lodge fleeing entities even if they are the right type and within range', () => {
      const wisp = t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [], incoming: [] },
        wispTag: true
      });

      const normalFirefly = t.world.add({
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
        fireflyTag: true,
        fleeingToGoalTag: true
      });

      t.runLodging();

      expect(wisp.lodge!.tenants).toHaveLength(1);
      expect(wisp.lodge!.tenants[0]).toBe(normalFirefly);
    });
  });

  describe('System queries', () => {
    it('should only process entities with Lodge and Position components', () => {
      t.world.add({
        position: { x: 100, y: 100 },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] }
      });

      t.world.add({
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] }
      });

      t.world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      expect(() => t.runLodging()).not.toThrow();
    });
  });
});
