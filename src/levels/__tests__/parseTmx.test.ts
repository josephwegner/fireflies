import { describe, it, expect } from 'vitest';
import { parseTmx } from '../parseTmx';

function makeTmx({
  width = 3,
  height = 2,
  tilewidth = 48,
  tileheight = 48,
  csv = '1,1,1,\n2,2,2',
  mapProperties = '',
  objects = ''
}: {
  width?: number;
  height?: number;
  tilewidth?: number;
  tileheight?: number;
  csv?: string;
  mapProperties?: string;
  objects?: string;
} = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.1" orientation="orthogonal" renderorder="right-down"
     width="${width}" height="${height}" tilewidth="${tilewidth}" tileheight="${tileheight}" infinite="0">
 ${mapProperties}
 <tileset firstgid="1" source="tiles.tsx"/>
 <layer id="1" name="terrain" width="${width}" height="${height}">
  <data encoding="csv">
${csv}
</data>
 </layer>
 <objectgroup id="2" name="entities">
  ${objects}
 </objectgroup>
</map>`;
}

// Default tilewidth/tileheight is 48, so offset is 24
const OFFSET = 24;

describe('parseTmx', () => {
  describe('tile layer', () => {
    it('should convert CSV tile data to number[][] with GID-1 mapping', () => {
      const result = parseTmx(makeTmx({ csv: '1,2,1,\n2,1,2' }));

      expect(result.map).toEqual([
        [0, 1, 0],
        [1, 0, 1]
      ]);
    });

    it('should handle different map dimensions', () => {
      const result = parseTmx(makeTmx({
        width: 4, height: 3,
        csv: '1,1,2,2,\n2,2,1,1,\n1,2,1,2'
      }));

      expect(result.map).toHaveLength(3);
      expect(result.map[0]).toHaveLength(4);
      expect(result.map).toEqual([
        [0, 0, 1, 1],
        [1, 1, 0, 0],
        [0, 1, 0, 1]
      ]);
    });
  });

  describe('map-level config', () => {
    it('should read initialEnergy from map properties', () => {
      const result = parseTmx(makeTmx({
        mapProperties: `<properties>
          <property name="initialEnergy" type="int" value="300"/>
        </properties>`
      }));

      expect(result.config.initialEnergy).toBe(300);
    });

    it('should default initialEnergy to 0 when not specified', () => {
      const result = parseTmx(makeTmx());

      expect(result.config.initialEnergy).toBe(0);
    });

    it('should read firefliesToWin from map properties', () => {
      const result = parseTmx(makeTmx({
        mapProperties: `<properties>
          <property name="firefliesToWin" type="int" value="5"/>
        </properties>`
      }));

      expect(result.config.firefliesToWin).toBe(5);
    });

    it('should default firefliesToWin to 1 when not specified', () => {
      const result = parseTmx(makeTmx());

      expect(result.config.firefliesToWin).toBe(1);
    });
  });

  describe('entity coordinate offset', () => {
    it('should offset entity positions by half a tile to align with marching squares', () => {
      const result = parseTmx(makeTmx({
        objects: `<object id="1" type="wisp" x="100" y="200">
          <point/>
        </object>`
      }));

      expect(result.entities[0]).toEqual({ type: 'wisp', x: 100 - OFFSET, y: 200 - OFFSET });
    });

    it('should offset redirect_exit positions too', () => {
      const result = parseTmx(makeTmx({
        objects: `
          <object id="5" type="redirect" x="400" y="300">
            <properties><property name="for" value="firefly"/></properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="450" y="200">
            <properties><property name="for" type="object" value="5"/></properties>
            <point/>
          </object>`
      }));

      const redirect = result.entities[0];
      if (redirect.type === 'redirect') {
        expect(redirect.exits[0].x).toBe(450 - OFFSET);
        expect(redirect.exits[0].y).toBe(200 - OFFSET);
      }
    });
  });

  describe('spawner entities', () => {
    it('should parse spawner with queue JSON', () => {
      const result = parseTmx(makeTmx({
        objects: `<object id="1" type="spawner" x="100" y="200">
          <properties>
            <property name="queue" value='[{"unit":"firefly","repeat":10,"delayBetween":500}]'/>
          </properties>
          <point/>
        </object>`
      }));

      expect(result.entities).toHaveLength(1);
      const spawner = result.entities[0];
      expect(spawner.type).toBe('spawner');
      expect(spawner.x).toBe(100 - OFFSET);
      expect(spawner.y).toBe(200 - OFFSET);
      if (spawner.type === 'spawner') {
        expect(spawner.queue).toEqual([{ unit: 'firefly', repeat: 10, delayBetween: 500 }]);
      }
    });
  });

  describe('goal entities', () => {
    it('should parse goal with for property', () => {
      const result = parseTmx(makeTmx({
        objects: `<object id="1" type="goal" x="500" y="300">
          <properties>
            <property name="for" value="firefly"/>
          </properties>
          <point/>
        </object>`
      }));

      expect(result.entities).toHaveLength(1);
      const goal = result.entities[0];
      expect(goal.type).toBe('goal');
      expect(goal.x).toBe(500 - OFFSET);
      expect(goal.y).toBe(300 - OFFSET);
      if (goal.type === 'goal') {
        expect(goal.for).toBe('firefly');
      }
    });
  });

  describe('wisp entities', () => {
    it('should parse wisp with position only', () => {
      const result = parseTmx(makeTmx({
        objects: `<object id="1" type="wisp" x="200" y="150">
          <point/>
        </object>`
      }));

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0]).toEqual({ type: 'wisp', x: 200 - OFFSET, y: 150 - OFFSET });
    });
  });

  describe('redirect entities', () => {
    it('should assemble redirect from redirect + redirect_exit objects', () => {
      const result = parseTmx(makeTmx({
        objects: `
          <object id="5" type="redirect" x="400" y="300">
            <properties>
              <property name="for" value="firefly"/>
            </properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="450" y="200">
            <properties>
              <property name="for" type="object" value="5"/>
            </properties>
            <point/>
          </object>
          <object id="7" type="redirect_exit" x="450" y="400">
            <properties>
              <property name="for" type="object" value="5"/>
            </properties>
            <point/>
          </object>`
      }));

      expect(result.entities).toHaveLength(1);
      const redirect = result.entities[0];
      expect(redirect.type).toBe('redirect');
      if (redirect.type === 'redirect') {
        expect(redirect.x).toBe(400 - OFFSET);
        expect(redirect.y).toBe(300 - OFFSET);
        expect(redirect.for).toBe('firefly');
        expect(redirect.exits).toHaveLength(2);
        expect(redirect.exits).toContainEqual({ x: 450 - OFFSET, y: 200 - OFFSET, weight: 1 });
        expect(redirect.exits).toContainEqual({ x: 450 - OFFSET, y: 400 - OFFSET, weight: 1 });
      }
    });

    it('should use weight property from redirect_exit when present', () => {
      const result = parseTmx(makeTmx({
        objects: `
          <object id="5" type="redirect" x="400" y="300">
            <properties>
              <property name="for" value="firefly"/>
            </properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="450" y="200">
            <properties>
              <property name="for" type="object" value="5"/>
              <property name="weight" type="int" value="3"/>
            </properties>
            <point/>
          </object>`
      }));

      const redirect = result.entities[0];
      if (redirect.type === 'redirect') {
        expect(redirect.exits[0].weight).toBe(3);
      }
    });

    it('should use radius property from redirect when present', () => {
      const result = parseTmx(makeTmx({
        objects: `
          <object id="5" type="redirect" x="400" y="300">
            <properties>
              <property name="for" value="firefly"/>
              <property name="radius" type="int" value="200"/>
            </properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="450" y="200">
            <properties>
              <property name="for" type="object" value="5"/>
            </properties>
            <point/>
          </object>`
      }));

      const redirect = result.entities[0];
      if (redirect.type === 'redirect') {
        expect(redirect.radius).toBe(200);
      }
    });

    it('should default radius to TILE_SIZE * 3 when not specified', () => {
      const result = parseTmx(makeTmx({
        tilewidth: 48,
        objects: `
          <object id="5" type="redirect" x="400" y="300">
            <properties>
              <property name="for" value="firefly"/>
            </properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="450" y="200">
            <properties>
              <property name="for" type="object" value="5"/>
            </properties>
            <point/>
          </object>`
      }));

      const redirect = result.entities[0];
      if (redirect.type === 'redirect') {
        expect(redirect.radius).toBe(48 * 3);
      }
    });

    it('should not include redirect_exit objects as standalone entities', () => {
      const result = parseTmx(makeTmx({
        objects: `
          <object id="5" type="redirect" x="400" y="300">
            <properties><property name="for" value="firefly"/></properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="450" y="200">
            <properties><property name="for" type="object" value="5"/></properties>
            <point/>
          </object>`
      }));

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('redirect');
    });

    it('should handle multiple redirects with their own exits', () => {
      const result = parseTmx(makeTmx({
        objects: `
          <object id="5" type="redirect" x="100" y="100">
            <properties><property name="for" value="firefly"/></properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="150" y="50">
            <properties><property name="for" type="object" value="5"/></properties>
            <point/>
          </object>
          <object id="9" type="redirect" x="300" y="100">
            <properties><property name="for" value="monster"/></properties>
            <point/>
          </object>
          <object id="10" type="redirect_exit" x="250" y="50">
            <properties><property name="for" type="object" value="9"/></properties>
            <point/>
          </object>`
      }));

      const redirects = result.entities.filter(e => e.type === 'redirect');
      expect(redirects).toHaveLength(2);

      const fireflyRedirect = redirects.find(e => e.type === 'redirect' && e.for === 'firefly');
      const monsterRedirect = redirects.find(e => e.type === 'redirect' && e.for === 'monster');

      expect(fireflyRedirect).toBeDefined();
      expect(monsterRedirect).toBeDefined();
      if (fireflyRedirect?.type === 'redirect') {
        expect(fireflyRedirect.exits).toHaveLength(1);
        expect(fireflyRedirect.exits[0].x).toBe(150 - OFFSET);
      }
      if (monsterRedirect?.type === 'redirect') {
        expect(monsterRedirect.exits).toHaveLength(1);
        expect(monsterRedirect.exits[0].x).toBe(250 - OFFSET);
      }
    });
  });

  describe('mixed entities', () => {
    it('should parse a complete level with all entity types', () => {
      const result = parseTmx(makeTmx({
        mapProperties: `<properties>
          <property name="initialEnergy" type="int" value="200"/>
        </properties>`,
        objects: `
          <object id="1" type="spawner" x="48" y="96">
            <properties>
              <property name="queue" value='[{"unit":"firefly","repeat":5,"delayBetween":300}]'/>
            </properties>
            <point/>
          </object>
          <object id="2" type="goal" x="480" y="96">
            <properties><property name="for" value="firefly"/></properties>
            <point/>
          </object>
          <object id="3" type="wisp" x="200" y="150">
            <point/>
          </object>
          <object id="5" type="redirect" x="300" y="100">
            <properties><property name="for" value="firefly"/></properties>
            <point/>
          </object>
          <object id="6" type="redirect_exit" x="350" y="50">
            <properties><property name="for" type="object" value="5"/></properties>
            <point/>
          </object>`
      }));

      expect(result.config.initialEnergy).toBe(200);
      expect(result.entities).toHaveLength(4);

      const types = result.entities.map(e => e.type);
      expect(types).toContain('spawner');
      expect(types).toContain('goal');
      expect(types).toContain('wisp');
      expect(types).toContain('redirect');
    });
  });
});
