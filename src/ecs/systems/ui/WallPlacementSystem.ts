import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import type { EnergyManager } from '@/ui/EnergyManager';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { createWallBlueprint } from '@/entities/factories';
import { nearestPointOnPolyline, raySegmentIntersection } from '@/utils/geometry';

type WallPlacementState = 'idle' | 'selectingFirst' | 'selectingSecond';

const SNAP_THRESHOLD = 30;

export class WallPlacementSystem implements GameSystem {
  private scene: Phaser.Scene;
  private world: GameWorld;
  private energyManager: EnergyManager;
  private walls: Query<With<Entity, 'wall' | 'wallTag'>>;

  private state: WallPlacementState = 'idle';
  private firstAnchor: { x: number; y: number } | null = null;
  private secondAnchor: { x: number; y: number } | null = null;
  private graphics: Phaser.GameObjects.Graphics;

  private onPlacementStarted: (data: { itemType: string; cost: number }) => void;
  private onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private onEscKey: () => void;

  constructor(world: GameWorld, config: Record<string, any>) {
    this.world = world;
    this.scene = config.scene;
    this.energyManager = config.energyManager;
    this.walls = world.with('wall', 'wallTag') as any;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(998);

    this.onPlacementStarted = (data) => {
      if (data.itemType === 'wall') this.startPlacement();
    };
    this.onPointerDown = (pointer) => this.handlePointerDown(pointer);
    this.onEscKey = () => this.cancel();

    gameEvents.on(GameEvents.PLACEMENT_STARTED, this.onPlacementStarted);
    this.scene.input.on('pointerdown', this.onPointerDown);
    this.scene.input.keyboard!.on('keydown-ESC', this.onEscKey);
  }

  private startPlacement(): void {
    this.state = 'selectingFirst';
    this.firstAnchor = null;
    this.secondAnchor = null;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.button === 2) {
      this.cancel();
      return;
    }
    if (pointer.button !== 0) return;

    if (this.state === 'selectingFirst') {
      const snap = this.getSnapPoint(pointer);
      if (!snap) return;
      this.firstAnchor = snap;
      this.state = 'selectingSecond';
    } else if (this.state === 'selectingSecond') {
      if (!this.secondAnchor) return;
      this.placeWall();
    }
  }

  private placeWall(): void {
    if (!this.firstAnchor || !this.secondAnchor) return;
    if (!this.energyManager.spend(GAME_CONFIG.WALL_BLUEPRINT_COST)) return;

    const entity = createWallBlueprint(
      this.world,
      this.firstAnchor,
      this.secondAnchor,
      GAME_CONFIG.WALL_BUILD_TIME
    );

    gameEvents.emit(GameEvents.WALL_BLUEPRINT_PLACED, { entity });
    gameEvents.emit(GameEvents.PLACEMENT_COMPLETED, {
      itemType: 'wall',
      x: entity.position!.x,
      y: entity.position!.y
    });

    this.reset();
  }

  private cancel(): void {
    if (this.state === 'idle') return;
    gameEvents.emit(GameEvents.PLACEMENT_CANCELLED, { itemType: 'wall' });
    this.reset();
  }

  private reset(): void {
    this.state = 'idle';
    this.firstAnchor = null;
    this.secondAnchor = null;
    this.graphics.clear();
  }

  update(_delta: number, _time: number): void {
    if (this.state === 'idle') return;

    this.graphics.clear();

    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    if (this.state === 'selectingFirst') {
      const snap = this.findNearestWallPoint(worldPoint.x, worldPoint.y);
      if (snap && snap.distance <= SNAP_THRESHOLD) {
        this.graphics.fillStyle(0x00ff00, 0.8);
        this.graphics.fillCircle(snap.point.x, snap.point.y, 5);
      }
    } else if (this.state === 'selectingSecond' && this.firstAnchor) {
      // Draw first anchor
      this.graphics.fillStyle(0x00ff00, 1);
      this.graphics.fillCircle(this.firstAnchor.x, this.firstAnchor.y, 5);

      // Find intersection point
      const intersection = this.findRayWallIntersection(
        this.firstAnchor,
        worldPoint.x,
        worldPoint.y
      );

      if (intersection) {
        this.secondAnchor = intersection;

        // Draw preview line
        this.graphics.lineStyle(2, 0x88AACC, 0.6);
        this.graphics.lineBetween(
          this.firstAnchor.x, this.firstAnchor.y,
          intersection.x, intersection.y
        );

        // Draw second anchor
        this.graphics.fillStyle(0x00ff00, 0.8);
        this.graphics.fillCircle(intersection.x, intersection.y, 5);
      } else {
        this.secondAnchor = null;

        // Draw invalid preview line
        this.graphics.lineStyle(1, 0xff0000, 0.3);
        this.graphics.lineBetween(
          this.firstAnchor.x, this.firstAnchor.y,
          worldPoint.x, worldPoint.y
        );
      }
    }
  }

  private getSnapPoint(pointer: Phaser.Input.Pointer): { x: number; y: number } | null {
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snap = this.findNearestWallPoint(worldPoint.x, worldPoint.y);
    if (snap && snap.distance <= SNAP_THRESHOLD) {
      return snap.point;
    }
    return null;
  }

  private findNearestWallPoint(x: number, y: number): { point: { x: number; y: number }; distance: number } | null {
    let bestResult: { point: { x: number; y: number }; distance: number } | null = null;

    for (const wallEntity of this.walls) {
      for (const segment of wallEntity.wall.segments) {
        if (segment.length < 2) continue;
        const result = nearestPointOnPolyline({ x, y }, segment);
        if (!bestResult || result.distance < bestResult.distance) {
          bestResult = { point: result.point, distance: result.distance };
        }
      }
    }

    return bestResult;
  }

  private findRayWallIntersection(
    origin: { x: number; y: number },
    cursorX: number,
    cursorY: number
  ): { x: number; y: number } | null {
    const dx = cursorX - origin.x;
    const dy = cursorY - origin.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;

    const dir = { x: dx / len, y: dy / len };
    let bestPoint: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    const MIN_WALL_LENGTH = 10;

    for (const wallEntity of this.walls) {
      for (const segment of wallEntity.wall.segments) {
        for (let i = 0; i < segment.length - 1; i++) {
          const hit = raySegmentIntersection(origin, dir, segment[i], segment[i + 1]);
          if (!hit) continue;

          const hitDist = Math.hypot(hit.x - origin.x, hit.y - origin.y);
          if (hitDist < MIN_WALL_LENGTH) continue;
          if (hitDist < bestDist) {
            bestDist = hitDist;
            bestPoint = hit;
          }
        }
      }
    }

    return bestPoint;
  }

  destroy(): void {
    this.graphics.destroy();
    gameEvents.off(GameEvents.PLACEMENT_STARTED, this.onPlacementStarted);
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.keyboard?.off('keydown-ESC', this.onEscKey);
  }
}
