import { describe, it, expect } from 'vitest';
import { ENTITY_CONFIG } from '../entities';

describe('Entity Configuration', () => {
  describe('Combat Timing', () => {
    it('firefly should have dramatic combat timing', () => {
      expect(ENTITY_CONFIG.firefly.combat).toBeDefined();
      const combat = ENTITY_CONFIG.firefly.combat!;
      
      // Longer charge for dramatic buildup
      expect(combat.chargeTime).toBe(1800);
      
      // Longer attack duration for visible dash
      expect(combat.attackDuration).toBe(500);
      
      // Recovery time for drift effect
      expect(combat.recoveryTime).toBe(600);
      
      // Attack properties
      expect(combat.damage).toBe(10);
      expect(combat.handlerType).toBe('dash');
      expect(combat.dashSpeed).toBe(100);
      expect(combat.knockbackForce).toBe(50);
    });

    it('monster should have slow menacing combat timing', () => {
      expect(ENTITY_CONFIG.monster.combat).toBeDefined();
      const combat = ENTITY_CONFIG.monster.combat!;
      
      // Slow, menacing charge
      expect(combat.chargeTime).toBe(2200);
      
      // Visible pulse expansion
      expect(combat.attackDuration).toBe(400);
      
      // Brief pause after attack
      expect(combat.recoveryTime).toBe(500);
      
      // Attack properties
      expect(combat.damage).toBe(25);
      expect(combat.handlerType).toBe('pulse');
      expect(combat.radius).toBe(40);
      expect(combat.knockbackForce).toBe(30);
    });

    it('combat phases should be long enough to be visible', () => {
      // At 60fps, each frame is ~16.67ms
      // Minimum visible duration should be at least 300ms (18 frames)
      const minVisibleDuration = 300;

      Object.entries(ENTITY_CONFIG).forEach(([type, config]) => {
        if (config.combat) {
          expect(config.combat.chargeTime).toBeGreaterThanOrEqual(minVisibleDuration);
          expect(config.combat.attackDuration).toBeGreaterThanOrEqual(minVisibleDuration);
          // Recovery can be 0 for some entities (though not recommended)
        }
      });
    });

    it('firefly should attack faster than monster (lower charge time)', () => {
      const fireflyCharge = ENTITY_CONFIG.firefly.combat!.chargeTime;
      const monsterCharge = ENTITY_CONFIG.monster.combat!.chargeTime;
      
      // Firefly should charge faster than monster
      expect(fireflyCharge).toBeLessThan(monsterCharge);
    });
  });
});
