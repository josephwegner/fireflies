import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { PulseAttackVisuals } from '../PulseAttackVisuals';
import { AttackContext } from '../../AttackHandler';
import { Combat, CombatState, Position, MonsterTag, Renderable } from '@/ecs/components';
import { ECSEntity } from '@/types';
import { createMockScene, createMockContainer, createMockGraphics, createMockCircle, createMockRectangle, createMockTriangle } from '@/__tests__/helpers/phaser-mocks';

describe('PulseAttackVisuals', () => {
  let visuals: PulseAttackVisuals;
  let world: World;
  let attacker: ECSEntity;
  let mockCombat: Combat;
  let mockScene: any;
  let mockContainer: any;

  beforeEach(() => {
    visuals = new PulseAttackVisuals();
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Combat)
      .registerComponent(MonsterTag)
      .registerComponent(Renderable);

    attacker = world.createEntity();
    attacker.addComponent(Position, { x: 0, y: 0 });
    attacker.addComponent(MonsterTag);
    attacker.addComponent(Renderable, {
      type: 'monster',
      radius: 8,
      color: 0xff0000,
      scale: 1.0,
      tint: 0xFFFFFF
    });

    mockCombat = {
      state: CombatState.CHARGING,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      hasHit: false,
      attackPattern: {
        handlerType: 'pulse',
        chargeTime: 1000,
        attackDuration: 100,
        recoveryTime: 500,
        damage: 25,
        knockbackForce: 30,
        radius: 50,
        targetTags: ['firefly'],
        color: 0xff0000
      }
    };

    mockScene = createMockScene();
    mockContainer = createMockContainer();

    vi.clearAllMocks();
  });

  describe('charging', () => {
    it('should handle missing scene gracefully', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spriteContainer: mockContainer,
        renderable: attacker.getMutableComponent(Renderable)!
      };

      expect(() => visuals.charging(context, 0.5)).not.toThrow();
    });

    it('should handle missing container gracefully', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        renderable: attacker.getMutableComponent(Renderable)!
      };

      expect(() => visuals.charging(context, 0.5)).not.toThrow();
    });

    it('should create converging rings in container', () => {
      const mockGraphics = createMockGraphics();
      mockScene.add.graphics.mockReturnValue(mockGraphics);

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        renderable: attacker.getMutableComponent(Renderable)!
      };

      visuals.charging(context, 0.5);

      // Should create 4 rings
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(4);
      expect(mockContainer.add).toHaveBeenCalledTimes(4);
    });

    it('should update attacker tint during charging', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      const originalTint = renderable.tint;

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        renderable
      };

      visuals.charging(context, 0);
      visuals.charging(context, 0.5);

      // Tint should change based on attack color
      expect(renderable.tint).not.toBe(originalTint);
    });

    it('should store original tint on first frame', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.tint = 0x00FF00; // Set a specific tint

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        renderable
      };

      visuals.charging(context, 0);

      // Original tint should be stored
      expect((mockContainer as any).originalTint).toBe(0x00FF00);
    });
  });

  describe('burst', () => {
    it('should handle missing scene gracefully', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spriteContainer: mockContainer
      };

      expect(() => visuals.burst(context)).not.toThrow();
    });

    it('should handle missing container gracefully', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene
      };

      expect(() => visuals.burst(context)).not.toThrow();
    });

    it('should create bloom flash graphics', () => {
      const mockGraphics = createMockGraphics();
      mockScene.add.graphics.mockReturnValue(mockGraphics);

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      visuals.burst(context);

      // Should create graphics for bloom, shockwave rings
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockContainer.add).toHaveBeenCalled();
    });

    it('should create shockwave rings', () => {
      const mockGraphics = createMockGraphics();
      mockScene.add.graphics.mockReturnValue(mockGraphics);

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      visuals.burst(context);

      // Should create graphics for bloom and shockwave rings (1 bloom + 4 rings = 5 total)
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(5);
    });

    it('should add all visual objects to container', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      visuals.burst(context);

      // Container.add should be called for bloom + 4 shockwave rings = 5 times
      expect(mockContainer.add.mock.calls.length).toBe(5);
    });
  });

  describe('recovery', () => {
    it('should handle missing renderable gracefully', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world
      };

      expect(() => visuals.recovery(context, 0.5)).not.toThrow();
    });

    it('should gradually restore tint', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.tint = 0xFF0000; // Set to red
      (mockContainer as any).originalTint = 0xFFFFFF; // Original was white

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        spriteContainer: mockContainer,
        renderable
      };

      // Start of recovery
      const initialTint = renderable.tint;
      visuals.recovery(context, 0.1);
      
      // Should move toward original tint
      expect(renderable.tint).not.toBe(initialTint);
    });

    it('should gradually restore scale', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.scale = 1.5; // Enlarged

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        renderable
      };

      visuals.recovery(context, 0.5);

      // Should move toward 1.0
      expect(renderable.scale).toBeLessThan(1.5);
    });
  });

  describe('cleanup', () => {
    it('should destroy all created visual objects', () => {
      const mockGraphics1 = createMockGraphics();
      const mockGraphics2 = createMockGraphics();
      const mockCircle = createMockCircle();

      mockScene.add.graphics
        .mockReturnValueOnce(mockGraphics1)
        .mockReturnValueOnce(mockGraphics2);
      mockScene.add.circle.mockReturnValue(mockCircle);

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      // Create visuals during charging and burst
      visuals.charging(context, 0.5);
      visuals.burst(context);

      // Cleanup should destroy everything
      visuals.cleanup();

      // All graphics and shapes should be destroyed
      expect(mockGraphics1.destroy).toHaveBeenCalled();
    });

    it('should handle cleanup when no visuals exist', () => {
      expect(() => visuals.cleanup()).not.toThrow();
    });

    it('should handle cleanup being called multiple times', () => {
      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      visuals.charging(context, 0.5);
      visuals.cleanup();
      
      // Second cleanup should not throw
      expect(() => visuals.cleanup()).not.toThrow();
    });

    it('should not destroy objects that have already been destroyed', () => {
      const mockGraphics = createMockGraphics();
      mockGraphics.scene = null; // Simulate already destroyed
      mockScene.add.graphics.mockReturnValue(mockGraphics);

      const context: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      visuals.charging(context, 0.5);

      // Should not throw when scene is null
      expect(() => visuals.cleanup()).not.toThrow();
    });
  });

  describe('multiple instances', () => {
    it('should handle multiple visual instances independently', () => {
      const visuals2 = new PulseAttackVisuals();

      const attacker2 = world.createEntity();
      attacker2.addComponent(Position, { x: 100, y: 100 });
      attacker2.addComponent(Renderable, {
        type: 'monster',
        radius: 8,
        color: 0x00ff00,
        scale: 1.0,
        tint: 0xFFFFFF
      });

      const mockContainer2 = createMockContainer();

      const context1: AttackContext = {
        attacker,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        renderable: attacker.getMutableComponent(Renderable)!
      };

      const context2: AttackContext = {
        attacker: attacker2,
        combat: mockCombat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer2,
        renderable: attacker2.getMutableComponent(Renderable)!
      };

      // Both charge simultaneously
      visuals.charging(context1, 0.5);
      visuals2.charging(context2, 0.3);

      // Both should have added to their respective containers
      expect(mockContainer.add).toHaveBeenCalled();
      expect(mockContainer2.add).toHaveBeenCalled();

      // Cleanup one shouldn't affect the other
      visuals.cleanup();
      expect(() => visuals2.cleanup()).not.toThrow();
    });
  });
});

