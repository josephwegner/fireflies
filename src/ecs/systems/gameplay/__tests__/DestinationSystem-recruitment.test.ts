import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DestinationSystem } from '../DestinationSystem';
import {
  createTestFirefly,
  createTestMonster,
  createTestWisp,
  createTestGoal,
} from '@/__tests__/helpers';
import { createDestinationTestSetup, type DestinationTestSetup } from './DestinationSystem-helpers';

describe('DestinationSystem — recruitment', () => {
  let t: DestinationTestSetup;
  let system: DestinationSystem;

  beforeEach(() => {
    t = createDestinationTestSetup();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Assigned lodge navigation', () => {
    it('should request path to assigned lodge for assigned entity with no current path', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      const wisp = createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world);

      t.world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });

    it('should not pre-compute goalPath for assigned entity (it should wait at target)', () => {
      const firefly = createTestFirefly(t.world, {
        x: 100, y: 100,
        currentPath: [{ x: 200, y: 200 }]
      });
      const wisp = createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world, { x: 500, y: 500 });

      t.world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const goalPathMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'next'
      );
      expect(goalPathMessages.length).toBe(0);
    });

    it('should skip all navigation when assignedDestination.holding is true', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      const wisp = createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world);

      t.world.addComponent(firefly, 'assignedDestination', { target: wisp, holding: true });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const allMessages = t.getPostMessages();
      expect(allMessages.length).toBe(0);
    });

    it('should navigate to assigned target when holding is false', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      const wisp = createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world);

      t.world.addComponent(firefly, 'assignedDestination', { target: wisp, holding: false });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter((m: any) => m.pathType === 'current');
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });

    it('should request path to goal for fleeing entity, ignoring assignment', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 100 });
      const wisp = createTestWisp(t.world, { x: 300, y: 300 });
      createTestGoal(t.world, { x: 500, y: 500 });

      t.world.addComponent(firefly, 'fleeingToGoalTag', true);
      t.world.addComponent(firefly, 'assignedDestination', { target: wisp });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBeGreaterThan(0);
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });
  });

  describe('Monsters with no lodges', () => {
    it('should path monsters directly to their goal', () => {
      const monster = createTestMonster(t.world, { x: 100, y: 100 });
      createTestGoal(t.world, { x: 500, y: 500, for: 'monster' });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessages().filter(
        (m: any) => m.pathType === 'current'
      );
      expect(navMessages.length).toBe(1);
      expect(navMessages[0].entityId).toBe(t.world.id(monster));
      expect(navMessages[0].destination).toEqual({ x: 500, y: 500 });
    });
  });

  describe('RedirectTarget handling', () => {
    it('should pathfind to redirectTarget when entity has no currentPath', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 200 });
      createTestGoal(t.world, { x: 500, y: 200 });

      t.world.addComponent(firefly, 'redirectTarget', { x: 250, y: 100 });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessagesByType('current');
      expect(navMessages.length).toBe(1);
      expect(navMessages[0].destination).toEqual({ x: 250, y: 100 });
    });

    it('should clear redirectTarget after consuming it', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 200 });
      createTestGoal(t.world, { x: 500, y: 200 });

      t.world.addComponent(firefly, 'redirectTarget', { x: 250, y: 100 });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      expect(firefly.redirectTarget).toBeUndefined();
    });

    it('should route goalPath from lastWaypoint to goal after redirect', () => {
      const firefly = createTestFirefly(t.world, {
        x: 100, y: 200,
        currentPath: [{ x: 250, y: 100 }]
      });
      createTestGoal(t.world, { x: 500, y: 200 });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const goalPathMessages = t.getPostMessagesByType('next');
      expect(goalPathMessages.length).toBe(1);
      expect(goalPathMessages[0].start).toEqual({ x: 250, y: 100 });
      expect(goalPathMessages[0].destination).toEqual({ x: 500, y: 200 });
    });

    it('should prefer redirectTarget over goal even when not fleeing', () => {
      const firefly = createTestFirefly(t.world, { x: 100, y: 200 });
      createTestGoal(t.world, { x: 500, y: 200 });

      t.world.addComponent(firefly, 'redirectTarget', { x: 300, y: 300 });

      system = new DestinationSystem(t.world, { pathfinding: t.pathfinding });
      system.update(16, 16);

      const navMessages = t.getPostMessagesByType('current');
      expect(navMessages[0].destination).toEqual({ x: 300, y: 300 });
    });
  });
});
