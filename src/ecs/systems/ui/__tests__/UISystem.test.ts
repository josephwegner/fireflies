import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { UISystem } from '../UISystem';
import { EnergyManager } from '@/ui/EnergyManager';
import { gameEvents, GameEvents } from '@/events';
import { createMockGraphics, createMockText, createMockSprite, createMockRectangle, createMockScene } from '@/__tests__/helpers';

function createUITestScene() {
  const mockText = createMockText();
  const mockCostText = createMockText();
  const mockBackground = createMockGraphics();
  const mockWallIcon = createMockGraphics();
  const mockSprite = createMockSprite(24, 24);
  const mockRect = createMockRectangle();

  const scene = createMockScene({ textureExists: () => true });

  scene.add.text
    .mockReset()
    .mockReturnValueOnce(mockText)
    .mockReturnValueOnce(mockCostText)
    .mockReturnValue(mockCostText);
  scene.add.graphics
    .mockReset()
    .mockReturnValueOnce(mockBackground)
    .mockReturnValue(mockWallIcon);
  scene.add.sprite
    .mockReset()
    .mockReturnValue(mockSprite);
  scene.add.rectangle
    .mockReset()
    .mockReturnValue(mockRect);

  return { scene, mockText, mockCostText, mockBackground, mockWallIcon, mockSprite, mockRect };
}

describe('UISystem', () => {
  let world: GameWorld;
  let energyManager: EnergyManager;
  let system: UISystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    energyManager = new EnergyManager(200);
  });

  describe('initialization', () => {
    it('should create HUD elements', () => {
      const { scene } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.add.sprite).toHaveBeenCalled();
    });

    it('should set scroll factor 0 on HUD elements', () => {
      const { scene, mockText, mockBackground, mockSprite } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      expect(mockText.setScrollFactor).toHaveBeenCalledWith(0);
      expect(mockBackground.setScrollFactor).toHaveBeenCalledWith(0);
      expect(mockSprite.setScrollFactor).toHaveBeenCalledWith(0);
    });

    it('should make wisp icon interactive', () => {
      const { scene, mockSprite } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      expect(mockSprite.setInteractive).toHaveBeenCalled();
    });
  });

  describe('energy display', () => {
    it('should show initial energy value', () => {
      const { scene, mockText } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      system.update(16, 16);

      expect(mockText.setText).toHaveBeenCalledWith('Energy: 200');
    });

    it('should update energy display after spending', () => {
      const { scene, mockText } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      energyManager.spend(50);
      system.update(16, 16);

      expect(mockText.setText).toHaveBeenCalledWith('Energy: 150');
    });
  });

  describe('store affordability', () => {
    it('should grey out wisp when unaffordable', () => {
      const { scene, mockSprite } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager: new EnergyManager(50),
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      system.update(16, 16);

      expect(mockSprite.setTint).toHaveBeenCalledWith(0x444444);
      expect(mockSprite.disableInteractive).toHaveBeenCalled();
    });

    it('should keep wisp active when affordable', () => {
      const { scene, mockSprite } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      system.update(16, 16);

      expect(mockSprite.clearTint).toHaveBeenCalled();
      expect(mockSprite.setInteractive).toHaveBeenCalled();
    });
  });

  describe('store click', () => {
    it('should emit PLACEMENT_STARTED when wisp icon is clicked', () => {
      const { scene, mockSprite } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      const listener = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_STARTED, listener);

      const clickHandler = mockSprite.on.mock.calls.find(
        (call: any[]) => call[0] === 'pointerdown'
      );
      expect(clickHandler).toBeDefined();
      clickHandler![1]();

      expect(listener).toHaveBeenCalledWith({ itemType: 'wisp', cost: 100 });
    });
  });

  describe('cleanup', () => {
    it('should destroy HUD elements on destroy', () => {
      const { scene, mockText, mockBackground, mockSprite, mockCostText } = createUITestScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      system.destroy!();

      expect(mockText.destroy).toHaveBeenCalled();
      expect(mockBackground.destroy).toHaveBeenCalled();
      expect(mockSprite.destroy).toHaveBeenCalled();
      expect(mockCostText.destroy).toHaveBeenCalled();
    });
  });
});
