import { describe, it, expect } from 'vitest';
import { ENTITY_CONFIG } from '../entities';

describe('Entity Configuration', () => {
  it('should have firefly configuration', () => {
    expect(ENTITY_CONFIG.firefly).toBeDefined();
    expect(ENTITY_CONFIG.firefly.type).toBe('firefly');
    expect(ENTITY_CONFIG.firefly.radius).toBe(5);
  });

  it('should have monster configuration', () => {
    expect(ENTITY_CONFIG.monster).toBeDefined();
    expect(ENTITY_CONFIG.monster.type).toBe('monster');
    expect(ENTITY_CONFIG.monster.color).toBe(0xff0000);
  });

  it('should have wisp configuration', () => {
    expect(ENTITY_CONFIG.wisp).toBeDefined();
    expect(ENTITY_CONFIG.wisp.isStatic).toBe(true);
  });

  it('should have goal configuration', () => {
    expect(ENTITY_CONFIG.goal).toBeDefined();
    expect(ENTITY_CONFIG.goal.isStatic).toBe(true);
  });

  it('all entities should have required properties', () => {
    Object.values(ENTITY_CONFIG).forEach(config => {
      expect(config.type).toBeDefined();
      expect(config.color).toBeDefined();
      expect(config.radius).toBeGreaterThan(0);
      expect(config.mass).toBeGreaterThan(0);
      expect(typeof config.isStatic).toBe('boolean');
    });
  });
});
