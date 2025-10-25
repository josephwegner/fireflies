export interface AssetDefinition {
  key: string;
  path: string;
  type: 'image' | 'audio' | 'spritesheet';
}

export const ASSET_MANIFEST: AssetDefinition[] = [
  // Entity sprites
  {
    key: 'firefly',
    path: 'assets/images/png/firefly.png',
    type: 'image'
  },
  {
    key: 'wisp',
    path: 'assets/images/png/wisp.png',
    type: 'image'
  },
  {
    key: 'wisp-full',
    path: 'assets/images/png/wisp-full.png',
    type: 'image'
  },
  {
    key: 'wisp-13-full',
    path: 'assets/images/png/wisp-13-full.png',
    type: 'image'
  },
  {
    key: 'wisp-23-full',
    path: 'assets/images/png/wisp-23-full.png',
    type: 'image'
  },
  {
    key: 'monster',
    path: 'assets/images/png/monster.png',
    type: 'image'
  },
  {
    key: 'monster1',
    path: 'assets/images/png/monster1.png',
    type: 'image'
  },
  {
    key: 'monster2',
    path: 'assets/images/png/monster2.png',
    type: 'image'
  },
  {
    key: 'greattree',
    path: 'assets/images/png/greattree.png', // Firefly goal sprite
    type: 'image'
  },
  {
    key: 'fireflywell',
    path: 'assets/images/png/fireflywell.png', // Monster goal sprite
    type: 'image'
  },
  
  // Environment sprites (trees)
  {
    key: 'tree1',
    path: 'assets/images/png/tree1.png',
    type: 'image'
  },
  {
    key: 'tree2',
    path: 'assets/images/png/tree2.png',
    type: 'image'
  },
  {
    key: 'tree3',
    path: 'assets/images/png/tree3.png',
    type: 'image'
  },
  {
    key: 'tree4',
    path: 'assets/images/png/tree4.png',
    type: 'image'
  }
];
