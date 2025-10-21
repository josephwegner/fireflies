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

describe('Wisp Configuration', () => {
  it('should have activeColor defined for wisp', () => {
    expect(ENTITY_CONFIG.wisp.activeColor).toBeDefined();
    expect(typeof ENTITY_CONFIG.wisp.activeColor).toBe('number');
  });

  it('wisp activeColor should be different from regular color', () => {
    expect(ENTITY_CONFIG.wisp.activeColor).not.toBe(ENTITY_CONFIG.wisp.color);
  });

  it('wisp activeColor should be valid hex color', () => {
    // Valid hex colors are between 0x000000 and 0xFFFFFF
    expect(ENTITY_CONFIG.wisp.activeColor!).toBeGreaterThanOrEqual(0x000000);
    expect(ENTITY_CONFIG.wisp.activeColor!).toBeLessThanOrEqual(0xFFFFFF);
  });
});
