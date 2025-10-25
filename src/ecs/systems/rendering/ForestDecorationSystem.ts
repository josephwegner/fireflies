import { System } from 'ecsy';
import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config';

export class ForestDecorationSystem extends System {
  private scene!: Phaser.Scene;
  private map!: number[][];
  private decorations: Phaser.GameObjects.Image[] = [];
  private treesCreated: boolean = false;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
  }

  init(attributes?: any): void {
    if (attributes?.scene) {
      this.scene = attributes.scene;
    }
    if (attributes?.map) {
      this.map = attributes.map;
    }
  }

  // Empty query object to ensure execute is always called
  static queries = {};

  execute(delta: number, time: number): void {
    // Only initialize decorations once, and only after assets are loaded
    if (!this.treesCreated) {
      if (!this.scene || !this.map) {
        return;
      }
      
      // Check if at least one tree texture is loaded before proceeding
      if (this.scene.textures.exists('tree1')) {
        this.createForestDecorations();
        this.treesCreated = true;
      }
    }
  }

  private createForestDecorations(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const treeKeys = ['tree1', 'tree2', 'tree3', 'tree4'];
    let treesPlaced = 0;

    console.log('[ForestDecorationSystem] Creating forest decorations...');
    console.log('[ForestDecorationSystem] Map size:', this.map.length, 'x', this.map[0]?.length);

    // Iterate through the map and place trees in non-pathable areas (value = 0)
    for (let row = 0; row < this.map.length; row++) {
      for (let col = 0; col < this.map[row].length; col++) {
        if (this.map[row][col] === 0) {
          // Non-pathable area - place a tree with some randomness
          // Not every non-pathable tile needs a tree
          if (Math.random() > 0.3) { // 70% chance to place a tree
            const x = col * TILE + TILE / 2;
            const y = (row - 1) * TILE + TILE / 2;
            
            // Randomly select a tree sprite
            const treeKey = treeKeys[Math.floor(Math.random() * treeKeys.length)];
            
            // Only create tree if texture exists
            if (this.scene.textures.exists(treeKey)) {
              const tree = this.scene.add.image(x, y, treeKey);
              
              // Ensure origin is at center (should be default, but being explicit)
              tree.setOrigin(0.5, 0.5);
              
              // Scale trees to fit nicely in the tile space
              const scale = (TILE * 1.2) / Math.max(tree.width, tree.height);
              tree.setScale(scale);
              
              // Add slight random offset for natural look
              tree.x += (Math.random() - 0.5) * TILE * 0.2;
              tree.y += (Math.random() - 0.5) * TILE * 0.2;
              
              // Reduce opacity slightly for depth
              tree.setAlpha(0.6 + Math.random() * 0.2); // 60-80% opacity
              
              // Set depth so trees render behind entities
              tree.setDepth(-1);
              
              this.decorations.push(tree);
              treesPlaced++;
            } else {
              console.warn('[ForestDecorationSystem] Tree texture not found:', treeKey);
            }
          }
        }
      }
    }
    
    console.log('[ForestDecorationSystem] Placed', treesPlaced, 'trees');
  }

  cleanup(): void {
    // Clean up all decoration sprites
    this.decorations.forEach(decoration => decoration.destroy());
    this.decorations = [];
    this.treesCreated = false;
  }
}

