export interface AssetDefinition {
  key: string;
  path: string;
  type: 'image' | 'audio' | 'spritesheet';
}

export const ASSET_MANIFEST: AssetDefinition[] = [
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
    key: 'monster',
    path: 'assets/images/png/monster.png',
    type: 'image'
  },
  {
    key: 'goal',
    path: 'assets/images/png/firefly.png', // Reusing firefly image for now
    type: 'image'
  }
];
