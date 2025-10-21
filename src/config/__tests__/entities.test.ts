import { describe, it, expect } from 'vitest';
import { ENTITY_CONFIG } from '../entities';

describe('Entity Configuration', () => {
  describe('Combat Timing', () => {
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
