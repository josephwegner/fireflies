import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { PlacementSystem } from '../PlacementSystem';
import { EnergyManager } from '@/ui/EnergyManager';
import { gameEvents, GameEvents } from '@/events';
import { GAME_CONFIG } from '@/config';

const TILE = GAME_CONFIG.TILE_SIZE;

const TEST_MAP = [
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 0, 1, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0]
];

function createMockScene() {
  const ghostSprite = {
    setAlpha: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    clearTint: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };

  const pointerHandlers: Record<string, Function> = {};
  const keyHandlers: Record<string, Function> = {};

  return {
    scene: {
      add: {
        sprite: vi.fn().mockReturnValue(ghostSprite)
      },
      input: {
        on: vi.fn((event: string, handler: Function) => {
          pointerHandlers[event] = handler;
        }),
        off: vi.fn(),
        activePointer: { x: 0, y: 0 },
        keyboard: {
          on: vi.fn((event: string, handler: Function) => {
            keyHandlers[event] = handler;
          }),
          off: vi.fn()
        }
      },
      cameras: {
        main: {
          getWorldPoint: vi.fn((x: number, y: number) => ({ x, y }))
        }
      }
    },
    ghostSprite,
    pointerHandlers,
    keyHandlers
  };
}

describe('PlacementSystem', () => {
  let world: GameWorld;
  let energyManager: EnergyManager;
  let system: PlacementSystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    energyManager = new EnergyManager(200);
  });

  describe('idle state', () => {
    it('should start in idle state', () => {
      const { scene } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      expect((system as any).state).toBe('idle');
    });

    it('should not create ghost sprite in idle', () => {
      const { scene } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      system.update(16, 16);

      expect(scene.add.sprite).not.toHaveBeenCalled();
    });
  });

  describe('placement start', () => {
    it('should enter placing state on PLACEMENT_STARTED event', () => {
      const { scene } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      expect((system as any).state).toBe('placing');
    });

    it('should create ghost sprite on placement start', () => {
      const { scene, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      expect(scene.add.sprite).toHaveBeenCalledWith(0, 0, 'wisp');
      expect(ghostSprite.setAlpha).toHaveBeenCalledWith(0.5);
    });
  });

  describe('cursor tracking', () => {
    it('should move ghost sprite to world pointer position during update', () => {
      const { scene, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      scene.input.activePointer.x = 200;
      scene.input.activePointer.y = 150;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 200, y: 150 });

      system.update(16, 16);

      expect(ghostSprite.setPosition).toHaveBeenCalledWith(200, 150);
    });

    it('should show valid tint on walkable tile', () => {
      const { scene, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const walkableX = 1 * TILE + TILE / 2;
      const walkableY = 1 * TILE + TILE / 2;
      scene.input.activePointer.x = walkableX;
      scene.input.activePointer.y = walkableY;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: walkableX, y: walkableY });

      system.update(16, 16);

      expect(ghostSprite.clearTint).toHaveBeenCalled();
      expect(ghostSprite.setAlpha).toHaveBeenCalledWith(0.5);
    });

    it('should show invalid tint on non-walkable tile', () => {
      const { scene, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const wallX = 0 * TILE + TILE / 2;
      const wallY = 0 * TILE + TILE / 2;
      scene.input.activePointer.x = wallX;
      scene.input.activePointer.y = wallY;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: wallX, y: wallY });

      system.update(16, 16);

      expect(ghostSprite.setTint).toHaveBeenCalledWith(0xff0000);
      expect(ghostSprite.setAlpha).toHaveBeenCalledWith(0.3);
    });
  });

  describe('placement execution', () => {
    it('should place wisp on valid tile click', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const walkableX = 1 * TILE + TILE / 2;
      const walkableY = 1 * TILE + TILE / 2;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: walkableX, y: walkableY });

      const listener = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_COMPLETED, listener);

      pointerHandlers['pointerdown']({ x: walkableX, y: walkableY, button: 0 });

      expect(listener).toHaveBeenCalledWith({
        itemType: 'wisp',
        x: walkableX,
        y: walkableY
      });
    });

    it('should deduct energy on placement', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const walkableX = 1 * TILE + TILE / 2;
      const walkableY = 1 * TILE + TILE / 2;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: walkableX, y: walkableY });

      pointerHandlers['pointerdown']({ x: walkableX, y: walkableY, button: 0 });

      expect(energyManager.getEnergy()).toBe(100);
    });

    it('should create a wisp entity on placement', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const walkableX = 1 * TILE + TILE / 2;
      const walkableY = 1 * TILE + TILE / 2;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: walkableX, y: walkableY });

      pointerHandlers['pointerdown']({ x: walkableX, y: walkableY, button: 0 });

      const wisps = world.with('wispTag', 'position');
      expect(wisps.entities.length).toBe(1);
      expect(wisps.entities[0].position.x).toBe(walkableX);
      expect(wisps.entities[0].position.y).toBe(walkableY);
    });

    it('should return to idle after placement', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const walkableX = 1 * TILE + TILE / 2;
      const walkableY = 1 * TILE + TILE / 2;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: walkableX, y: walkableY });

      pointerHandlers['pointerdown']({ x: walkableX, y: walkableY, button: 0 });

      expect((system as any).state).toBe('idle');
    });

    it('should not place wisp on non-walkable tile', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const wallX = 0 * TILE + TILE / 2;
      const wallY = 0 * TILE + TILE / 2;
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: wallX, y: wallY });

      pointerHandlers['pointerdown']({ x: wallX, y: wallY, button: 0 });

      expect(energyManager.getEnergy()).toBe(200);
      expect((system as any).state).toBe('placing');
    });

    it('should not place wisp outside map bounds', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: -50, y: -50 });

      pointerHandlers['pointerdown']({ x: -50, y: -50, button: 0 });

      expect(energyManager.getEnergy()).toBe(200);
      expect((system as any).state).toBe('placing');
    });
  });

  describe('cancellation', () => {
    it('should cancel on right-click', () => {
      const { scene, pointerHandlers, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const listener = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, listener);

      pointerHandlers['pointerdown']({ x: 100, y: 100, button: 2 });

      expect((system as any).state).toBe('idle');
      expect(ghostSprite.destroy).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith({ itemType: 'wisp' });
    });

    it('should cancel on Escape key', () => {
      const { scene, keyHandlers, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });

      const listener = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, listener);

      keyHandlers['keydown-ESC']();

      expect((system as any).state).toBe('idle');
      expect(ghostSprite.destroy).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith({ itemType: 'wisp' });
    });

    it('should not deduct energy on cancellation', () => {
      const { scene, pointerHandlers } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });
      pointerHandlers['pointerdown']({ x: 100, y: 100, button: 2 });

      expect(energyManager.getEnergy()).toBe(200);
    });
  });

  describe('cleanup', () => {
    it('should clean up on destroy', () => {
      const { scene } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      expect(() => system.destroy!()).not.toThrow();
    });

    it('should destroy ghost sprite on destroy if placing', () => {
      const { scene, ghostSprite } = createMockScene();
      system = new PlacementSystem(world, {
        scene, energyManager, map: TEST_MAP,
        levelConfig: { store: { wisp: { cost: 100 } } }
      });

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 100 });
      system.destroy!();

      expect(ghostSprite.destroy).toHaveBeenCalled();
    });
  });
});
