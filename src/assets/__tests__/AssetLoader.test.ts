import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetLoader } from '../AssetLoader';
import { ASSET_MANIFEST } from '../AssetManifest';
import { createMockScene } from '@/__tests__/helpers';

describe('AssetLoader', () => {
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
  });

  describe('preloadAll', () => {
    it('should load all assets from manifest', () => {
      AssetLoader.preloadAll(mockScene);

      expect(mockScene.load.image).toHaveBeenCalled();
    });

    it('should call loadAsset for each asset in manifest', () => {
      const loadAssetSpy = vi.spyOn(AssetLoader, 'loadAsset');

      AssetLoader.preloadAll(mockScene);

      expect(loadAssetSpy).toHaveBeenCalledTimes(ASSET_MANIFEST.length);
      ASSET_MANIFEST.forEach(asset => {
        expect(loadAssetSpy).toHaveBeenCalledWith(mockScene, asset);
      });

      loadAssetSpy.mockRestore();
    });
  });

  describe('loadAsset', () => {
    it('should load image asset', () => {
      const asset = {
        key: 'test-image',
        path: 'assets/test.png',
        type: 'image' as const
      };

      AssetLoader.loadAsset(mockScene, asset);

      expect(mockScene.load.image).toHaveBeenCalledWith('test-image', 'assets/test.png');
    });

    it('should load audio asset', () => {
      const asset = {
        key: 'test-audio',
        path: 'assets/test.mp3',
        type: 'audio' as const
      };

      AssetLoader.loadAsset(mockScene, asset);

      expect(mockScene.load.audio).toHaveBeenCalledWith('test-audio', 'assets/test.mp3');
    });

    it('should warn for spritesheet asset (not yet implemented)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const asset = {
        key: 'test-spritesheet',
        path: 'assets/test-spritesheet.png',
        type: 'spritesheet' as const
      };

      AssetLoader.loadAsset(mockScene, asset);

      expect(consoleSpy).toHaveBeenCalledWith('Spritesheet loading not yet implemented');
      expect(mockScene.load.spritesheet).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should warn for unknown asset type', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const asset = {
        key: 'test-unknown',
        path: 'assets/test.xyz',
        type: 'unknown' as any
      };

      AssetLoader.loadAsset(mockScene, asset);

      expect(consoleSpy).toHaveBeenCalledWith('Unknown asset type: unknown');

      consoleSpy.mockRestore();
    });

    it('should handle multiple image assets', () => {
      const assets = [
        { key: 'image1', path: 'assets/img1.png', type: 'image' as const },
        { key: 'image2', path: 'assets/img2.png', type: 'image' as const },
        { key: 'image3', path: 'assets/img3.png', type: 'image' as const }
      ];

      assets.forEach(asset => AssetLoader.loadAsset(mockScene, asset));

      expect(mockScene.load.image).toHaveBeenCalledTimes(3);
      expect(mockScene.load.image).toHaveBeenCalledWith('image1', 'assets/img1.png');
      expect(mockScene.load.image).toHaveBeenCalledWith('image2', 'assets/img2.png');
      expect(mockScene.load.image).toHaveBeenCalledWith('image3', 'assets/img3.png');
    });

    it('should handle multiple audio assets', () => {
      const assets = [
        { key: 'sound1', path: 'assets/sound1.mp3', type: 'audio' as const },
        { key: 'sound2', path: 'assets/sound2.mp3', type: 'audio' as const }
      ];

      assets.forEach(asset => AssetLoader.loadAsset(mockScene, asset));

      expect(mockScene.load.audio).toHaveBeenCalledTimes(2);
      expect(mockScene.load.audio).toHaveBeenCalledWith('sound1', 'assets/sound1.mp3');
      expect(mockScene.load.audio).toHaveBeenCalledWith('sound2', 'assets/sound2.mp3');
    });

    it('should handle mixed asset types', () => {
      const assets = [
        { key: 'image', path: 'assets/img.png', type: 'image' as const },
        { key: 'sound', path: 'assets/sound.mp3', type: 'audio' as const }
      ];

      assets.forEach(asset => AssetLoader.loadAsset(mockScene, asset));

      expect(mockScene.load.image).toHaveBeenCalledWith('image', 'assets/img.png');
      expect(mockScene.load.audio).toHaveBeenCalledWith('sound', 'assets/sound.mp3');
    });
  });

  describe('isLoaded', () => {
    it('should return true when all assets exist', () => {
      mockScene.textures.exists.mockReturnValue(true);

      const result = AssetLoader.isLoaded(mockScene, ['asset1', 'asset2', 'asset3']);

      expect(result).toBe(true);
      expect(mockScene.textures.exists).toHaveBeenCalledTimes(3);
    });

    it('should return false when some assets are missing', () => {
      mockScene.textures.exists.mockImplementation((key: string) => key !== 'asset2');

      const result = AssetLoader.isLoaded(mockScene, ['asset1', 'asset2', 'asset3']);

      expect(result).toBe(false);
    });

    it('should return false when all assets are missing', () => {
      mockScene.textures.exists.mockReturnValue(false);

      const result = AssetLoader.isLoaded(mockScene, ['asset1', 'asset2', 'asset3']);

      expect(result).toBe(false);
    });

    it('should return true for empty asset list', () => {
      const result = AssetLoader.isLoaded(mockScene, []);

      expect(result).toBe(true);
      expect(mockScene.textures.exists).not.toHaveBeenCalled();
    });

    it('should check each asset key individually', () => {
      mockScene.textures.exists.mockReturnValue(true);

      AssetLoader.isLoaded(mockScene, ['firefly', 'monster', 'goal']);

      expect(mockScene.textures.exists).toHaveBeenCalledWith('firefly');
      expect(mockScene.textures.exists).toHaveBeenCalledWith('monster');
      expect(mockScene.textures.exists).toHaveBeenCalledWith('goal');
    });

    it('should short-circuit on first missing asset', () => {
      let callCount = 0;
      mockScene.textures.exists.mockImplementation(() => {
        callCount++;
        return callCount !== 2;
      });

      const result = AssetLoader.isLoaded(mockScene, ['asset1', 'asset2', 'asset3']);

      expect(result).toBe(false);
      expect(callCount).toBe(2);
    });
  });
});
