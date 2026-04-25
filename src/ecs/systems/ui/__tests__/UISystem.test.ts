import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { UISystem } from '../UISystem';
import { EnergyManager } from '@/ui/EnergyManager';
import { gameEvents, GameEvents } from '@/events';
import { createMockGraphics } from '@/__tests__/helpers';

function createMockScene() {
  const mockText = {
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };

  const mockBackground = createMockGraphics();
  const mockWallIcon = createMockGraphics();

  const mockRect = {
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };

  const mockSprite = {
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    clearTint: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    displayWidth: 24,
    displayHeight: 24
  };

  const mockCostText = {
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };

  return {
    scene: {
      add: {
        text: vi.fn().mockReturnValueOnce(mockText)
          .mockReturnValueOnce(mockCostText)
          .mockReturnValue(mockCostText),
        graphics: vi.fn().mockReturnValueOnce(mockBackground).mockReturnValue(mockWallIcon),
        sprite: vi.fn().mockReturnValue(mockSprite),
        rectangle: vi.fn().mockReturnValue(mockRect)
      },
      scale: {
        width: 1200,
        height: 800,
        on: vi.fn()
      },
      textures: {
        exists: vi.fn().mockReturnValue(true)
      }
    },
    mockText,
    mockBackground,
    mockWallIcon,
    mockRect,
    mockSprite,
    mockCostText
  };
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
      const { scene } = createMockScene();
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
      const { scene, mockText, mockBackground, mockSprite } = createMockScene();
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
      const { scene, mockSprite } = createMockScene();
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
      const { scene, mockText } = createMockScene();
      system = new UISystem(world, {
        scene,
        energyManager,
        levelConfig: { store: { wisp: { cost: 100 }, wall: { cost: 20 } } }
      });

      system.update(16, 16);

      expect(mockText.setText).toHaveBeenCalledWith('Energy: 200');
    });

    it('should update energy display after spending', () => {
      const { scene, mockText } = createMockScene();
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
      const { scene, mockSprite } = createMockScene();
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
      const { scene, mockSprite } = createMockScene();
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
      const { scene, mockSprite } = createMockScene();
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
      const { scene, mockText, mockBackground, mockSprite, mockCostText } = createMockScene();
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
