import { System } from 'ecsy';
import { Wall, WallTag } from '@/ecs/components';
import { ECSEntity } from '@/types';

interface Point {
  x: number;
  y: number;
}

const CASE_LOOKUP: Record<number, string[][]> = {
  0: [],
  1: [['left', 'top']],
  2: [['top', 'right']],
  3: [['left', 'right']],
  4: [['left', 'bottom']],
  5: [['top', 'bottom']],
  6: [['top', 'bottom']],
  7: [['right', 'bottom']],
  8: [['right', 'bottom']],
  9: [['top', 'bottom']],
  10: [['top', 'bottom']],
  11: [['left', 'bottom']],
  12: [['left', 'right']],
  13: [['top', 'right']],
  14: [['left', 'top']],
  15: []
};

export class WallGenerationSystem extends System {
  private wallEntity: ECSEntity | null = null;
  private worker!: Worker;
  private map!: number[][];

  init(attributes?: any): void {
    if (attributes?.worker) {
      this.worker = attributes.worker;
    }
    if (attributes?.map) {
      this.map = attributes.map;
    }
  }

  execute(): void {
    if (this.wallEntity) return;
    if (!this.map) return;

    this.wallEntity = this.world.createEntity();

    const segments = this.generateWallSegments(this.map);
    this.wallEntity.addComponent(Wall, {
      segments,
      thickness: 2,
      color: 0x888888
    });

    this.wallEntity.addComponent(WallTag);

    this.worker.postMessage({
      action: 'buildNavMesh',
      walls: segments
    });
  }

  private generateWallSegments(map: number[][]): Point[][] {
    const tileSize = 32;
    const contours = this.marchingSquaresContours(map, tileSize);
    return contours.map(contour => this.smoothWallSegment(contour));
  }

  private marchingSquaresContours(map: number[][], tileSize: number): Point[][] {
    const height = map.length;
    const width = map[0].length;
    const segments: [Point, Point][] = [];

    const midpoints: Record<string, [number, number]> = {
      top: [0.5, 0],
      right: [1, 0.5],
      bottom: [0.5, 1],
      left: [0, 0.5]
    };

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const p0 = map[y][x];
        const p1 = map[y][x + 1];
        const p2 = map[y + 1][x];
        const p3 = map[y + 1][x + 1];

        let caseIndex = (p0 * 1) + (p1 * 2) + (p2 * 4) + (p3 * 8);
        caseIndex = 15 - caseIndex;

        const caseSegments = CASE_LOOKUP[caseIndex];

        caseSegments.forEach(([edge1, edge2]) => {
          const p1: Point = {
            x: (x + midpoints[edge1][0]) * tileSize,
            y: (y + midpoints[edge1][1]) * tileSize
          };
          const p2: Point = {
            x: (x + midpoints[edge2][0]) * tileSize,
            y: (y + midpoints[edge2][1]) * tileSize
          };

          segments.push([p1, p2]);
        });
      }
    }

    return this.buildContoursFromSegments(segments);
  }

  private buildContoursFromSegments(segments: [Point, Point][]): Point[][] {
    const connections = new Map<string, Point[]>();

    const pointKey = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

    segments.forEach(([p1, p2]) => {
      const k1 = pointKey(p1);
      const k2 = pointKey(p2);

      if (!connections.has(k1)) connections.set(k1, []);
      if (!connections.has(k2)) connections.set(k2, []);

      connections.get(k1)!.push(p2);
      connections.get(k2)!.push(p1);
    });

    const visited = new Set<string>();
    const contours: Point[][] = [];

    const markVisited = (a: Point, b: Point) => {
      visited.add(`${pointKey(a)}-${pointKey(b)}`);
      visited.add(`${pointKey(b)}-${pointKey(a)}`);
    };

    const isVisited = (a: Point, b: Point) => {
      return visited.has(`${pointKey(a)}-${pointKey(b)}`) ||
             visited.has(`${pointKey(b)}-${pointKey(a)}`);
    };

    for (const [key, connectedPoints] of connections.entries()) {
      const startPoint = this.parsePointKey(key);

      for (const nextPoint of connectedPoints) {
        if (isVisited(startPoint, nextPoint)) continue;

        const contour: Point[] = [startPoint];
        let current = nextPoint;
        let previous = startPoint;

        markVisited(previous, current);
        contour.push(current);

        while (true) {
          const neighbors = connections.get(pointKey(current)) || [];
          let nextFound = false;

          for (const neighbor of neighbors) {
            if (!isVisited(current, neighbor)) {
              previous = current;
              current = neighbor;
              markVisited(previous, current);
              contour.push(current);
              nextFound = true;
              break;
            }
          }

          if (!nextFound) break;

          if (pointKey(current) === pointKey(startPoint)) {
            break;
          }
        }

        if (contour.length >= 3) {
          contours.push(contour);
        }
      }
    }

    return contours;
  }

  private parsePointKey(key: string): Point {
    const [x, y] = key.split(',');
    return { x: parseFloat(x), y: parseFloat(y) };
  }

  private smoothWallSegment(points: Point[]): Point[] {
    if (points.length < 3) return points;

    const smoothedPoints: Point[] = [];
    const tension = 0.5;

    smoothedPoints.push(points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

      const numPoints = 5;
      for (let t = 0; t < 1; t += 1 / numPoints) {
        smoothedPoints.push(this.getCatmullRomPoint(t, p0, p1, p2, p3, tension));
      }
    }

    smoothedPoints.push(points[points.length - 1]);

    return smoothedPoints;
  }

  private getCatmullRomPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point, _tension: number): Point {
    const t2 = t * t;
    const t3 = t2 * t;

    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return { x, y };
  }

  static queries = {};
}
