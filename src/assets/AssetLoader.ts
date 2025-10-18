import Phaser from 'phaser';
import { ASSET_MANIFEST, AssetDefinition } from './AssetManifest';

export class AssetLoader {
  /**
   * Preload all assets defined in the manifest
   */
  static preloadAll(scene: Phaser.Scene): void {
    ASSET_MANIFEST.forEach(asset => {
      AssetLoader.loadAsset(scene, asset);
    });
  }

  /**
   * Load a single asset
   */
  static loadAsset(scene: Phaser.Scene, asset: AssetDefinition): void {
    switch (asset.type) {
      case 'image':
        scene.load.image(asset.key, asset.path);
        break;
      case 'spritesheet':
        // Future: Add spritesheet loading with frame config
        console.warn('Spritesheet loading not yet implemented');
        break;
      case 'audio':
        scene.load.audio(asset.key, asset.path);
        break;
      default:
        console.warn(`Unknown asset type: ${asset.type}`);
    }
  }

  /**
   * Check if all required assets are loaded
   */
  static isLoaded(scene: Phaser.Scene, assetKeys: string[]): boolean {
    return assetKeys.every(key => scene.textures.exists(key));
  }
}
