interface Point {
  x: number;
  y: number;
}

export function pointToSegmentDistance(point: Point, segA: Point, segB: Point): number {
  const dx = segB.x - segA.x;
  const dy = segB.y - segA.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(point.x - segA.x, point.y - segA.y);
  }

  let t = ((point.x - segA.x) * dx + (point.y - segA.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = segA.x + t * dx;
  const projY = segA.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

export function nearestPointOnPolyline(
  point: Point,
  polyline: Point[]
): { point: Point; distance: number; segmentIndex: number } {
  if (polyline.length < 2) {
    throw new Error('Polyline must have at least 2 points');
  }

  let bestDist = Infinity;
  let bestPoint: Point = polyline[0];
  let bestSegment = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const projected = projectPointOnSegment(point, a, b);
    const dist = Math.hypot(point.x - projected.x, point.y - projected.y);

    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = projected;
      bestSegment = i;
    }
  }

  return { point: bestPoint, distance: bestDist, segmentIndex: bestSegment };
}

function projectPointOnSegment(point: Point, segA: Point, segB: Point): Point {
  const dx = segB.x - segA.x;
  const dy = segB.y - segA.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { x: segA.x, y: segA.y };

  let t = ((point.x - segA.x) * dx + (point.y - segA.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return { x: segA.x + t * dx, y: segA.y + t * dy };
}

export function raySegmentIntersection(
  origin: Point,
  direction: Point,
  segA: Point,
  segB: Point
): Point | null {
  const dx = segB.x - segA.x;
  const dy = segB.y - segA.y;

  const denom = direction.x * dy - direction.y * dx;
  if (Math.abs(denom) < 1e-10) return null;

  const ox = segA.x - origin.x;
  const oy = segA.y - origin.y;

  const t = (ox * dy - oy * dx) / denom;
  if (t < 0) return null;

  const u = (ox * direction.y - oy * direction.x) / denom;
  if (u < 0 || u > 1) return null;

  return {
    x: origin.x + t * direction.x,
    y: origin.y + t * direction.y
  };
}

export function lineSegmentToRect(
  a: Point,
  b: Point,
  thickness: number
): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);

  if (len === 0) return [a, a, a, a];

  const halfThick = thickness / 2;
  const nx = (-dy / len) * halfThick;
  const ny = (dx / len) * halfThick;

  return [
    { x: a.x + nx, y: a.y + ny },
    { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny },
    { x: a.x - nx, y: a.y - ny }
  ];
}
