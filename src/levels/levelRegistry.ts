import level1Tmx from '../../maps/level1.tmx?raw';
import level2Tmx from '../../maps/level2.tmx?raw';
import level3Tmx from '../../maps/level3.tmx?raw';
import demoTmx from '../../maps/demo.tmx?raw';

export const LEVELS: readonly string[] = [level1Tmx, level2Tmx, level3Tmx];

export const LEVELS_BY_NAME: Readonly<Record<string, string>> = {
  level1: level1Tmx,
  level2: level2Tmx,
  level3: level3Tmx,
  demo: demoTmx,
};
