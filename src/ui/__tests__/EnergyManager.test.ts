import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnergyManager } from '../EnergyManager';
import { gameEvents, GameEvents } from '@/events';

describe('EnergyManager', () => {
  let manager: EnergyManager;

  beforeEach(() => {
    gameEvents.clear();
    manager = new EnergyManager(200);
  });

  describe('initialization', () => {
    it('should start with the given energy', () => {
      expect(manager.getEnergy()).toBe(200);
    });

    it('should start with zero energy when given zero', () => {
      const empty = new EnergyManager(0);
      expect(empty.getEnergy()).toBe(0);
    });
  });

  describe('canAfford', () => {
    it('should return true when energy is sufficient', () => {
      expect(manager.canAfford(100)).toBe(true);
    });

    it('should return true when cost equals current energy', () => {
      expect(manager.canAfford(200)).toBe(true);
    });

    it('should return false when energy is insufficient', () => {
      expect(manager.canAfford(201)).toBe(false);
    });

    it('should return true for zero cost', () => {
      expect(manager.canAfford(0)).toBe(true);
    });
  });

  describe('spend', () => {
    it('should deduct energy and return true when affordable', () => {
      const result = manager.spend(100);

      expect(result).toBe(true);
      expect(manager.getEnergy()).toBe(100);
    });

    it('should not deduct energy and return false when unaffordable', () => {
      const result = manager.spend(300);

      expect(result).toBe(false);
      expect(manager.getEnergy()).toBe(200);
    });

    it('should emit ENERGY_CHANGED on successful spend', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ENERGY_CHANGED, listener);

      manager.spend(50);

      expect(listener).toHaveBeenCalledWith({ current: 150 });
    });

    it('should not emit ENERGY_CHANGED on failed spend', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.ENERGY_CHANGED, listener);

      manager.spend(300);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow spending down to zero', () => {
      expect(manager.spend(200)).toBe(true);
      expect(manager.getEnergy()).toBe(0);
    });

    it('should handle multiple spends', () => {
      manager.spend(50);
      manager.spend(50);
      manager.spend(50);

      expect(manager.getEnergy()).toBe(50);
    });
  });
});
