import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { GameSystemBase, type SystemConfig } from '@/ecs/GameSystem';
import type { EnergyManager } from '@/ui/EnergyManager';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { createWallBlueprint } from '@/entities/factories';
import { nearestPointOnPolyline, raySegmentIntersection } from '@/utils';

type WallPlacementState = 'idle' | 'selectingFirst' | 'selectingSecond';

const SNAP_THRESHOLD = 30;
const BLUEPRINT_COLOR = 0x88AACC;
const NODE_RADIUS = 5;

export class WallPlacementSystem extends GameSystemBase {
  private scene: Phaser.Scene;
  private world: GameWorld;
  private energyManager: EnergyManager;
  private walls: Query<With<Entity, 'wall' | 'wallTag'>>;

  private state: WallPlacementState = 'idle';
  private firstAnchor: { x: number; y: number } | null = null;
  private secondAnchor: { x: number; y: number } | null = null;
  private graphics: Phaser.GameObjects.Graphics;

  private onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private onEscKey: () => void;

  constructor(world: GameWorld, config: Pick<SystemConfig, 'scene' | 'energyManager'>) {
    super();
    this.world = world;
    this.scene = config.scene;
    this.energyManager = config.energyManager;
    this.walls = world.with('wall', 'wallTag') as any;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(998);

    this.listen(GameEvents.PLACEMENT_STARTED, this.handlePlacementStarted);

    this.onPointerDown = (pointer) => this.handlePointerDown(pointer);
    this.onEscKey = () => this.cancel();
    this.scene.input.on('pointerdown', this.onPointerDown);
    this.scene.input.keyboard!.on('keydown-ESC', this.onEscKey);
  }

  private handlePlacementStarted(data: { itemType: string; cost: number }): void {
    if (data.itemType === 'wall') this.startPlacement();
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
        this.graphics.lineStyle(2, 0xFFFFFF, 0.8);
        this.graphics.strokeCircle(snap.point.x, snap.point.y, NODE_RADIUS);
      }
    } else if (this.state === 'selectingSecond' && this.firstAnchor) {
      this.graphics.lineStyle(2, 0xFFFFFF, 0.8);
      this.graphics.strokeCircle(this.firstAnchor.x, this.firstAnchor.y, NODE_RADIUS);

      const intersection = this.findRayWallIntersection(
        this.firstAnchor,
        worldPoint.x,
        worldPoint.y
      );

      if (intersection) {
        this.secondAnchor = intersection;

        this.drawDashedLine(this.firstAnchor, intersection);

        this.graphics.lineStyle(2, 0xFFFFFF, 0.8);
        this.graphics.strokeCircle(intersection.x, intersection.y, NODE_RADIUS);
      } else {
        this.secondAnchor = null;

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

  private drawDashedLine(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;

    this.graphics.lineStyle(2, BLUEPRINT_COLOR, 0.5);
    let traveled = 0;
    while (traveled < len) {
      const segEnd = Math.min(traveled + GAME_CONFIG.WALL_DASH_LENGTH, len);
      this.graphics.lineBetween(
        from.x + nx * traveled, from.y + ny * traveled,
        from.x + nx * segEnd, from.y + ny * segEnd
      );
      traveled = segEnd + GAME_CONFIG.WALL_GAP_LENGTH;
    }
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
    super.destroy();
    this.graphics.destroy();
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.keyboard?.off('keydown-ESC', this.onEscKey);
  }
}
