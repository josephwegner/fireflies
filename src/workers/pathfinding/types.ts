export interface Point {
  x: number;
  y: number;
}

export interface PathfindMessage {
  action: 'pathfind';
  requestId: string;
  entityId: number;
  start: Point;
  destination: Point;
  pathType: string;
  radius: number;
  wallBufferMultiplier: number;
}

export interface BuildNavMeshMessage {
  action: 'buildNavMesh';
  walls: Point[][];
}

export interface UpdateWallsMessage {
  action: 'updateWalls';
  walls: Point[][];
}

export type WorkerMessage = PathfindMessage | BuildNavMeshMessage | UpdateWallsMessage;

export interface NavMeshReadyResponse {
  action: 'navmeshReady';
  pathCount: number;
}

export interface PathfindResponse {
  requestId: string;
  entityId: number;
  path: Point[];
  pathType: string;
}

export interface ErrorResponse {
  action: 'error';
  error: string;
  stack?: string;
  entityId?: number;
  requestId?: string;
}

export interface NavMeshUpdatedResponse {
  action: 'navmeshUpdated';
}

export type WorkerResponse = NavMeshReadyResponse | PathfindResponse | ErrorResponse | NavMeshUpdatedResponse;

export interface NavMesh {
  findPath(start: Point, end: Point): Point[] | null;
  isPointInMesh(point: Point): boolean;
  findClosestMeshPoint(point: Point, maxAllowableDist?: number): { distance: number; polygon: unknown; point: Point | null };
}

export type MultiPolygon = number[][][];

export interface FlattenResult {
  vertices: number[];
  holes: number[];
  dimensions: number;
}
