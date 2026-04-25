import { describe, it, expect } from 'vitest';
import { ENTITY_CONFIG } from '../entities';

describe('Entity Configuration', () => {
  describe('Combat Timing', () => {
    it('combat phases should be long enough to be visible', () => {
      const minVisibleDuration = 300;

      Object.entries(ENTITY_CONFIG).forEach(([type, config]) => {
        if (config.combat) {
          expect(config.combat.chargeTime).toBeGreaterThanOrEqual(minVisibleDuration);
          expect(config.combat.attackDuration).toBeGreaterThanOrEqual(minVisibleDuration);
        }
      });
    });

    it('firefly should attack faster than monster (lower charge time)', () => {
      const fireflyCharge = ENTITY_CONFIG.firefly.combat!.chargeTime;
      const monsterCharge = ENTITY_CONFIG.monster.combat!.chargeTime;

      expect(fireflyCharge).toBeLessThan(monsterCharge);
    });
  });

  describe('Visual Configuration', () => {
    it('all renderable entities should have visual config', () => {
      const renderableTypes = ['firefly', 'wisp', 'monster', 'goalFirefly', 'goalMonster'];
      for (const type of renderableTypes) {
        expect(ENTITY_CONFIG[type].visual, `${type} should have visual config`).toBeDefined();
      }
    });

    it('firefly visual should have glow with pulse', () => {
      const visual = ENTITY_CONFIG.firefly.visual!;
      expect(visual.sprite).toBe('firefly');
      expect(visual.depth).toBe(50);
      expect(visual.rotationSpeed).toBe(0);
      expect(visual.tint).toBe(0xFFFFFF);
      expect(visual.glow).toBeDefined();
      expect(visual.glow!.radius).toBe(22);
      expect(visual.glow!.color).toBe(0xDEF4B4);
      expect(visual.glow!.intensity).toBe(0.4);
      expect(visual.glow!.pulse).toBeDefined();
      expect(visual.glow!.pulse!.speed).toBe(0.6);
      expect(visual.glow!.pulse!.minIntensity).toBe(0.4);
      expect(visual.glow!.pulse!.maxIntensity).toBe(0.7);
    });

    it('firefly visual should have trail config', () => {
      const visual = ENTITY_CONFIG.firefly.visual!;
      expect(visual.trail).toBeDefined();
      expect(visual.trail!.length).toBe(100);
      expect(visual.trail!.fadeTime).toBe(800);
      expect(visual.trail!.color).toBe(0xDEF4B4);
      expect(visual.trail!.width).toBe(4);
      expect(visual.trail!.minAlpha).toBe(0.05);
    });

    it('wisp visual should have glow with pulse and rotation', () => {
      const visual = ENTITY_CONFIG.wisp.visual!;
      expect(visual.sprite).toBe('wisp');
      expect(visual.depth).toBe(40);
      expect(visual.rotationSpeed).toBe(Math.PI * 0.5);
      expect(visual.tint).toBe(ENTITY_CONFIG.wisp.color);
      expect(visual.collisionRadius).toBe(45);
      expect(visual.glow).toBeDefined();
      expect(visual.glow!.radius).toBe(45);
      expect(visual.glow!.color).toBe(0xB0C4DE);
      expect(visual.glow!.intensity).toBe(0.5);
      expect(visual.glow!.pulse).toBeDefined();
    });

    it('wisp visual should have activation overrides', () => {
      const visual = ENTITY_CONFIG.wisp.visual!;
      expect(visual.activeGlow).toBeDefined();
      expect(visual.activeGlow!.radius).toBe(30);
      expect(visual.activeGlow!.color).toBe(0x5ED6FE);
      expect(visual.activeGlow!.intensity).toBe(0.8);
    });

    it('monster visual should have sprite and rotation', () => {
      const visual = ENTITY_CONFIG.monster.visual!;
      expect(visual.sprite).toBe('monster1');
      expect(visual.depth).toBe(100);
      expect(visual.rotationSpeed).toBe(Math.PI * 0.2);
      expect(visual.tint).toBe(0xFFFFFF);
    });

    it('goalFirefly visual should have greattree sprite and glow', () => {
      const config = ENTITY_CONFIG.goalFirefly;
      const visual = config.visual!;
      expect(visual.sprite).toBe('greattree');
      expect(visual.spriteRadius).toBe(60);
      expect(visual.depth).toBe(10);
      expect(visual.offsetY).toBe(-48);
      expect(visual.glow).toBeDefined();
      expect(visual.glow!.radius).toBe(45);
      expect(visual.glow!.color).toBe(0xC65D3B);
      expect(visual.glow!.intensity).toBe(0.4);
    });

    it('goalMonster visual should have fireflywell sprite and no glow', () => {
      const config = ENTITY_CONFIG.goalMonster;
      const visual = config.visual!;
      expect(visual.sprite).toBe('fireflywell');
      expect(visual.spriteRadius).toBe(30);
      expect(visual.depth).toBe(10);
      expect(visual.offsetY).toBe(-18);
      expect(visual.glow).toBeUndefined();
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
    expect(ENTITY_CONFIG.wisp.activeColor!).toBeGreaterThanOrEqual(0x000000);
    expect(ENTITY_CONFIG.wisp.activeColor!).toBeLessThanOrEqual(0xFFFFFF);
  });
});
