import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { ParticleEffectsSystem } from '../ParticleEffectsSystem';
import { gameEvents, GameEvents } from '@/events';
import { createMockScene } from '@/__tests__/helpers';

function createTestSetup() {
  const world: GameWorld = new World<Entity>();
  const scene = createMockScene() as any;
  const system = new ParticleEffectsSystem(world, { scene });
  return { world, scene, system };
}

describe('ParticleEffectsSystem', () => {
  beforeEach(() => {
    gameEvents.clear();
  });

  describe('event wiring', () => {
    it('should create particles on TENANT_ADDED_TO_LODGE', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: {} as Entity,
        tenantEntity: { position: { x: 100, y: 200 } } as Entity
      });

      expect(scene.add.circle).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
      system.destroy();
    });

    it('should not create particles when tenant has no position', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: {} as Entity,
        tenantEntity: {} as Entity
      });

      expect(scene.add.circle).not.toHaveBeenCalled();
      system.destroy();
    });

    it('should create geometric particles on monster death', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { team: 'monster' } as Entity,
        position: { x: 150, y: 250 }
      });

      expect(scene.tweens.add).toHaveBeenCalled();
      // Geometric dispersion creates 8 particles using shapes (rectangle, triangle, circle)
      const totalCalls = scene.add.rectangle.mock.calls.length
        + scene.add.triangle.mock.calls.length
        + scene.add.circle.mock.calls.length;
      expect(totalCalls).toBe(8);
      system.destroy();
    });

    it('should create light burst on static entity death', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { team: 'firefly', physicsBody: { isStatic: true } } as Entity,
        position: { x: 100, y: 100 }
      });

      // Light burst creates 12 circle particles
      expect(scene.add.circle).toHaveBeenCalledTimes(12);
      system.destroy();
    });

    it('should use glow color for static entity death particles', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: {
          team: 'firefly',
          physicsBody: { isStatic: true },
          renderable: { glow: { color: 0xFF0000 } }
        } as unknown as Entity,
        position: { x: 100, y: 100 }
      });

      const firstCircleCall = scene.add.circle.mock.calls[0];
      expect(firstCircleCall[3]).toBe(0xFF0000);
      system.destroy();
    });

    it('should not create particles for non-monster non-static entity death', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { team: 'firefly' } as Entity,
        position: { x: 100, y: 100 }
      });

      expect(scene.add.circle).not.toHaveBeenCalled();
      expect(scene.add.rectangle).not.toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('particle creation', () => {
    it('should create light burst with 12 particles in a ring', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: {} as Entity,
        tenantEntity: { position: { x: 100, y: 100 } } as Entity
      });

      expect(scene.add.circle).toHaveBeenCalledTimes(12);
      expect(scene.tweens.add).toHaveBeenCalledTimes(12);
      system.destroy();
    });

    it('should create geometric dispersion with mixed shapes', () => {
      const { scene, system } = createTestSetup();

      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { team: 'monster' } as Entity,
        position: { x: 100, y: 100 }
      });

      // 8 shapes: indices 0,3,6 → rectangle (3), indices 1,4,7 → triangle (3), indices 2,5 → circle (2)
      expect(scene.add.rectangle.mock.calls.length).toBe(3);
      expect(scene.add.triangle.mock.calls.length).toBe(3);
      expect(scene.add.circle.mock.calls.length).toBe(2);
      system.destroy();
    });

    it('should destroy particles when tween completes', () => {
      const { scene, system } = createTestSetup();
      const particle = scene.add.circle();

      scene.add.circle.mockClear();
      scene.add.circle.mockReturnValue(particle);

      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: {} as Entity,
        tenantEntity: { position: { x: 100, y: 100 } } as Entity
      });

      // The mock scene's tweens.add calls onComplete immediately
      expect(particle.destroy).toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('update', () => {
    it('should not throw on update (no-op)', () => {
      const { system } = createTestSetup();
      expect(() => system.update(16, 16)).not.toThrow();
      system.destroy();
    });
  });

  describe('destroy', () => {
    it('should stop responding to events after destroy', () => {
      const { scene, system } = createTestSetup();
      system.destroy();

      scene.add.circle.mockClear();
      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: {} as Entity,
        tenantEntity: { position: { x: 100, y: 200 } } as Entity
      });

      expect(scene.add.circle).not.toHaveBeenCalled();
    });
  });
});
