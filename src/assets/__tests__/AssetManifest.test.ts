import { describe, it, expect } from 'vitest';
import { ASSET_MANIFEST } from '../AssetManifest';

describe('Asset Manifest', () => {
  it('should have all required entity assets', () => {
    const keys = ASSET_MANIFEST.map(asset => asset.key);

    expect(keys).toContain('firefly');
    expect(keys).toContain('wisp');
    expect(keys).toContain('monster');
    expect(keys).toContain('greattree');
    expect(keys).toContain('fireflywell');
  });

  it('all assets should have valid properties', () => {
    ASSET_MANIFEST.forEach(asset => {
      expect(asset.key).toBeDefined();
      expect(asset.key.length).toBeGreaterThan(0);
      expect(asset.path).toBeDefined();
      expect(asset.path).toMatch(/^assets\//);
      expect(['image', 'audio', 'spritesheet']).toContain(asset.type);
    });
  });

  it('all image paths should end with valid extensions', () => {
    const imageAssets = ASSET_MANIFEST.filter(a => a.type === 'image');

    imageAssets.forEach(asset => {
      expect(asset.path).toMatch(/\.(png|jpg|jpeg|gif)$/);
    });
  });
});
