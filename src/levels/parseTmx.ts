import type { LevelData, EntityDescriptor } from './loadLevel';

export function parseTmx(xml: string): LevelData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const mapEl = doc.querySelector('map')!;

  const width = parseInt(mapEl.getAttribute('width')!);
  const tilewidth = parseInt(mapEl.getAttribute('tilewidth')!);
  const tileheight = parseInt(mapEl.getAttribute('tileheight')!);

  const map = parseTileLayer(doc, width);
  const config = parseMapProperties(mapEl);
  const entities = parseEntities(doc, tilewidth, tileheight);

  return { map, config, entities };
}

function parseTileLayer(doc: Document, width: number): number[][] {
  const dataEl = doc.querySelector('layer > data')!;
  const csv = dataEl.textContent!.trim();
  const gids = csv.split(/[,\s]+/).filter(s => s.length > 0).map(s => parseInt(s));

  const rows: number[][] = [];
  for (let i = 0; i < gids.length; i += width) {
    rows.push(gids.slice(i, i + width).map(gid => gid - 1));
  }
  return rows;
}

function parseMapProperties(mapEl: Element): { initialEnergy: number; firefliesToWin: number } {
  const props = readProperties(mapEl);
  return {
    initialEnergy: parseInt(props.get('initialEnergy') ?? '0') || 0,
    firefliesToWin: parseInt(props.get('firefliesToWin') ?? '1') || 1
  };
}

function parseEntities(doc: Document, tilewidth: number, tileheight: number): EntityDescriptor[] {
  const objects = Array.from(doc.querySelectorAll('objectgroup > object'));
  const objectsById = new Map<string, Element>();
  for (const obj of objects) {
    objectsById.set(obj.getAttribute('id')!, obj);
  }

  // Tiled places objects in tile-area coordinates (tile center = x*tw + tw/2),
  // but the game's marching squares treats grid cells as corner points (x*tw).
  // Offset by half a tile to align Tiled visuals with game rendering.
  const offsetX = tilewidth / 2;
  const offsetY = tileheight / 2;

  const exitsByRedirectId = new Map<string, { x: number; y: number; weight: number }[]>();
  for (const obj of objects) {
    if (obj.getAttribute('type') !== 'redirect_exit') continue;
    const props = readProperties(obj);
    const parentId = props.get('for');
    if (!parentId) continue;

    const weight = parseInt(props.get('weight') ?? '1') || 1;
    const x = parseFloat(obj.getAttribute('x')!) - offsetX;
    const y = parseFloat(obj.getAttribute('y')!) - offsetY;

    if (!exitsByRedirectId.has(parentId)) {
      exitsByRedirectId.set(parentId, []);
    }
    exitsByRedirectId.get(parentId)!.push({ x, y, weight });
  }

  const entities: EntityDescriptor[] = [];

  for (const obj of objects) {
    const type = obj.getAttribute('type');
    const x = parseFloat(obj.getAttribute('x')!) - offsetX;
    const y = parseFloat(obj.getAttribute('y')!) - offsetY;
    const props = readProperties(obj);

    switch (type) {
      case 'spawner': {
        const queue = JSON.parse(props.get('queue') ?? '[]');
        entities.push({ type: 'spawner', x, y, queue });
        break;
      }
      case 'goal': {
        const forType = props.get('for') ?? '';
        entities.push({ type: 'goal', x, y, for: forType });
        break;
      }
      case 'wisp': {
        entities.push({ type: 'wisp', x, y });
        break;
      }
      case 'redirect': {
        const id = obj.getAttribute('id')!;
        const forType = props.get('for') ?? '';
        const radius = parseInt(props.get('radius') ?? '0') || tilewidth * 3;
        const exits = exitsByRedirectId.get(id) ?? [];
        entities.push({ type: 'redirect', x, y, for: forType, exits, radius });
        break;
      }
    }
  }

  return entities;
}

function readProperties(el: Element): Map<string, string> {
  const map = new Map<string, string>();
  const propEls = el.querySelectorAll(':scope > properties > property');
  for (const prop of propEls) {
    const name = prop.getAttribute('name');
    const value = prop.getAttribute('value');
    if (name && value !== null) {
      map.set(name, value);
    }
  }
  return map;
}
