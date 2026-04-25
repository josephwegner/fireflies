import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { WallPlacementSystem } from '../WallPlacementSystem';
import { EnergyManager } from '@/ui/EnergyManager';
import { gameEvents, GameEvents } from '@/events';
import { createMockScene, createMockGraphics } from '@/__tests__/helpers';
import { GAME_CONFIG } from '@/config';

vi.mock('@/entities/factories', () => ({
  createWallBlueprint: vi.fn((_world, nodeA, nodeB, _buildTime) => ({
    position: { x: (nodeA.x + nodeB.x) / 2, y: (nodeA.y + nodeB.y) / 2 },
    wallBlueprintTag: true
  }))
}));

import { createWallBlueprint } from '@/entities/factories';

function createTestSetup(initialEnergy = 100) {
  const world: GameWorld = new World<Entity>();
  const scene = createMockScene() as any;
  const energyManager = new EnergyManager(initialEnergy);

  scene.input.keyboard = { on: vi.fn(), off: vi.fn() };

  const system = new WallPlacementSystem(world, { scene, energyManager });

  return { world, scene, energyManager, system };
}

function addWall(world: GameWorld, segments: Array<Array<{ x: number; y: number }>>) {
  return world.add({
    wall: { segments },
    wallTag: true
  } as Entity);
}

function makePointer(x: number, y: number, button = 0) {
  return { x, y, button } as Phaser.Input.Pointer;
}

describe('WallPlacementSystem', () => {
  beforeEach(() => {
    gameEvents.clear();
    vi.mocked(createWallBlueprint).mockClear();
  });

  describe('initialization', () => {
    it('should create graphics overlay', () => {
      const { scene, system } = createTestSetup();
      expect(scene.add.graphics).toHaveBeenCalled();
      system.destroy();
    });

    it('should register pointer and keyboard listeners', () => {
      const { scene, system } = createTestSetup();
      expect(scene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(scene.input.keyboard.on).toHaveBeenCalledWith('keydown-ESC', expect.any(Function));
      system.destroy();
    });

    it('should listen for PLACEMENT_STARTED events', () => {
      const { scene, system } = createTestSetup();
      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      // System should now be in selectingFirst state - pressing ESC should cancel
      const escHandler = getEscHandler(scene);
      escHandler();
      expect(spy).toHaveBeenCalled();
      system.destroy();
    });

    it('should ignore PLACEMENT_STARTED for non-wall items', () => {
      const { scene, system } = createTestSetup();
      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wisp', cost: 10 });

      const escHandler = getEscHandler(scene);
      escHandler();
      expect(spy).not.toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('first point selection', () => {
    it('should snap to nearest wall point within threshold', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 100, y: 100 }, { x: 200, y: 100 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 110, y: 105 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(110, 105));

      // Now in selectingSecond state - update should draw first anchor
      scene.input.activePointer = { x: 200, y: 200 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 200, y: 200 });
      system.update(16, 16);

      const graphics = scene.add.graphics.mock.results[0].value;
      expect(graphics.strokeCircle).toHaveBeenCalled();
      system.destroy();
    });

    it('should reject clicks too far from any wall', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 100, y: 100 }, { x: 200, y: 100 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 500, y: 500 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(500, 500));

      // Should still be in selectingFirst - ESC should cancel
      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);
      const escHandler = getEscHandler(scene);
      escHandler();
      expect(spy).toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('second point selection and wall placement', () => {
    it('should place wall when second anchor is valid', () => {
      const { world, scene, energyManager, system } = createTestSetup();
      addWall(world, [[{ x: 0, y: 0 }, { x: 0, y: 300 }]]);
      addWall(world, [[{ x: 200, y: 0 }, { x: 200, y: 300 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      // Click first anchor (on left wall)
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 0, y: 100 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(0, 100));

      // Move pointer toward second wall to set secondAnchor via update
      scene.input.activePointer = { x: 200, y: 100 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 200, y: 100 });
      system.update(16, 16);

      // Click to place
      const placedSpy = vi.fn();
      gameEvents.on(GameEvents.WALL_BLUEPRINT_PLACED, placedSpy);
      pointerHandler(makePointer(200, 100));

      expect(createWallBlueprint).toHaveBeenCalled();
      expect(placedSpy).toHaveBeenCalled();
      system.destroy();
    });

    it('should not place wall when energy is insufficient', () => {
      const { world, scene, system } = createTestSetup(0);
      addWall(world, [[{ x: 0, y: 0 }, { x: 0, y: 300 }]]);
      addWall(world, [[{ x: 200, y: 0 }, { x: 200, y: 300 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 0, y: 100 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(0, 100));

      scene.input.activePointer = { x: 200, y: 100 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 200, y: 100 });
      system.update(16, 16);

      const placedSpy = vi.fn();
      gameEvents.on(GameEvents.WALL_BLUEPRINT_PLACED, placedSpy);
      pointerHandler(makePointer(200, 100));

      expect(placedSpy).not.toHaveBeenCalled();
      system.destroy();
    });

    it('should emit PLACEMENT_COMPLETED after wall is placed', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 0, y: 0 }, { x: 0, y: 300 }]]);
      addWall(world, [[{ x: 200, y: 0 }, { x: 200, y: 300 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 0, y: 100 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(0, 100));

      scene.input.activePointer = { x: 200, y: 100 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 200, y: 100 });
      system.update(16, 16);

      const completedSpy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_COMPLETED, completedSpy);
      pointerHandler(makePointer(200, 100));

      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ itemType: 'wall' })
      );
      system.destroy();
    });
  });

  describe('cancellation', () => {
    it('should cancel on right-click', () => {
      const { scene, system } = createTestSetup();
      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);

      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(100, 100, 2));

      expect(spy).toHaveBeenCalledWith({ itemType: 'wall' });
      system.destroy();
    });

    it('should cancel on ESC key', () => {
      const { scene, system } = createTestSetup();
      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);

      const escHandler = getEscHandler(scene);
      escHandler();

      expect(spy).toHaveBeenCalledWith({ itemType: 'wall' });
      system.destroy();
    });

    it('should not emit cancel when already idle', () => {
      const { scene, system } = createTestSetup();

      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);

      const escHandler = getEscHandler(scene);
      escHandler();

      expect(spy).not.toHaveBeenCalled();
      system.destroy();
    });

    it('should reset state after cancel', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 100, y: 100 }, { x: 200, y: 100 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      const escHandler = getEscHandler(scene);
      escHandler();

      // After cancel, update should not draw anything (idle state)
      const graphics = scene.add.graphics.mock.results[0].value;
      graphics.clear.mockClear();
      graphics.strokeCircle.mockClear();

      system.update(16, 16);
      expect(graphics.strokeCircle).not.toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('update rendering', () => {
    it('should do nothing when idle', () => {
      const { scene, system } = createTestSetup();
      const graphics = scene.add.graphics.mock.results[0].value;
      graphics.clear.mockClear();

      system.update(16, 16);
      expect(graphics.clear).not.toHaveBeenCalled();
      system.destroy();
    });

    it('should show snap indicator when near a wall in selectingFirst state', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 100, y: 100 }, { x: 200, y: 100 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.input.activePointer = { x: 105, y: 102 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 105, y: 102 });

      system.update(16, 16);

      const graphics = scene.add.graphics.mock.results[0].value;
      expect(graphics.strokeCircle).toHaveBeenCalled();
      system.destroy();
    });

    it('should show red line when no intersection found in selectingSecond state', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 0, y: 0 }, { x: 0, y: 300 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 0, y: 100 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(0, 100));

      // Point away from any wall
      scene.input.activePointer = { x: 500, y: 500 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 500, y: 500 });
      system.update(16, 16);

      const graphics = scene.add.graphics.mock.results[0].value;
      expect(graphics.lineBetween).toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up graphics', () => {
      const { scene, system } = createTestSetup();
      const graphics = scene.add.graphics.mock.results[0].value;
      system.destroy();
      expect(graphics.destroy).toHaveBeenCalled();
    });

    it('should remove input listeners', () => {
      const { scene, system } = createTestSetup();
      system.destroy();
      expect(scene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(scene.input.keyboard.off).toHaveBeenCalledWith('keydown-ESC', expect.any(Function));
    });

    it('should unsubscribe from game events', () => {
      const { system } = createTestSetup();
      system.destroy();

      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });
      // If listener was removed, the system shouldn't have transitioned to active
      // Pressing ESC would do nothing since system never got the start event
      expect(spy).not.toHaveBeenCalled();
      system.destroy();
    });
  });

  describe('edge cases', () => {
    it('should ignore non-left non-right clicks', () => {
      const { scene, system } = createTestSetup();
      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(100, 100, 1)); // middle click

      // Should still be in selectingFirst
      const spy = vi.fn();
      gameEvents.on(GameEvents.PLACEMENT_CANCELLED, spy);
      const escHandler = getEscHandler(scene);
      escHandler();
      expect(spy).toHaveBeenCalled();
      system.destroy();
    });

    it('should handle empty world with no walls', () => {
      const { scene, system } = createTestSetup();
      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.input.activePointer = { x: 100, y: 100 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 100, y: 100 });

      expect(() => system.update(16, 16)).not.toThrow();
      system.destroy();
    });

    it('should reset to idle after successful placement', () => {
      const { world, scene, system } = createTestSetup();
      addWall(world, [[{ x: 0, y: 0 }, { x: 0, y: 300 }]]);
      addWall(world, [[{ x: 200, y: 0 }, { x: 200, y: 300 }]]);

      gameEvents.emit(GameEvents.PLACEMENT_STARTED, { itemType: 'wall', cost: 20 });

      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 0, y: 100 });
      const pointerHandler = getPointerHandler(scene);
      pointerHandler(makePointer(0, 100));

      scene.input.activePointer = { x: 200, y: 100 };
      scene.cameras.main.getWorldPoint.mockReturnValue({ x: 200, y: 100 });
      system.update(16, 16);

      pointerHandler(makePointer(200, 100));

      // Should be back to idle - update shouldn't clear graphics
      const graphics = scene.add.graphics.mock.results[0].value;
      graphics.clear.mockClear();
      system.update(16, 16);
      expect(graphics.clear).not.toHaveBeenCalled();
      system.destroy();
    });
  });
});

function getPointerHandler(scene: any): (pointer: Phaser.Input.Pointer) => void {
  const call = scene.input.on.mock.calls.find(
    (c: any[]) => c[0] === 'pointerdown'
  );
  return call[1];
}

function getEscHandler(scene: any): () => void {
  const call = scene.input.keyboard.on.mock.calls.find(
    (c: any[]) => c[0] === 'keydown-ESC'
  );
  return call[1];
}
