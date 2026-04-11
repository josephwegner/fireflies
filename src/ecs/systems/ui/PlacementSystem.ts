import type { GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import type { EnergyManager } from '@/ui/EnergyManager';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { createWisp } from '@/entities/factories';

type PlacementState = 'idle' | 'placing';

export class PlacementSystem implements GameSystem {
  private scene: Phaser.Scene;
  private world: GameWorld;
  private energyManager: EnergyManager;
  private map: number[][];
  private cost: number;

  private state: PlacementState = 'idle';
  private ghostSprite: Phaser.GameObjects.Sprite | null = null;
  private selectedItemType: string | null = null;

  private onPlacementStarted: (data: { itemType: string; cost: number }) => void;
  private onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private onEscKey: () => void;

  constructor(world: GameWorld, config: Record<string, any>) {
    this.world = world;
    this.scene = config.scene;
    this.energyManager = config.energyManager;
    this.map = config.map;
    this.cost = config.levelConfig.store.wisp.cost;

    this.onPlacementStarted = (data) => this.startPlacement(data.itemType, data.cost);
    this.onPointerDown = (pointer) => this.handlePointerDown(pointer);
    this.onEscKey = () => this.cancelPlacement();

    gameEvents.on(GameEvents.PLACEMENT_STARTED, this.onPlacementStarted);
    this.scene.input.on('pointerdown', this.onPointerDown);
    this.scene.input.keyboard!.on('keydown-ESC', this.onEscKey);
  }

  private startPlacement(itemType: string, cost: number): void {
    if (this.state === 'placing') {
      this.cancelPlacement();
    }

    this.selectedItemType = itemType;
    this.cost = cost;
    this.state = 'placing';

    this.ghostSprite = this.scene.add.sprite(0, 0, itemType);
    this.ghostSprite.setAlpha(0.5);
    this.ghostSprite.setDepth(999);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state !== 'placing') return;

    if (pointer.button === 2) {
      this.cancelPlacement();
      return;
    }

    if (pointer.button !== 0) return;

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / GAME_CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / GAME_CONFIG.TILE_SIZE);

    if (!this.isWalkable(tileX, tileY)) return;
    if (!this.energyManager.spend(this.cost)) return;

    createWisp(this.world, worldPoint.x, worldPoint.y);

    gameEvents.emit(GameEvents.PLACEMENT_COMPLETED, {
      itemType: this.selectedItemType!,
      x: worldPoint.x,
      y: worldPoint.y
    });

    this.cleanupGhost();
    this.state = 'idle';
    this.selectedItemType = null;
  }

  private cancelPlacement(): void {
    if (this.state !== 'placing') return;

    gameEvents.emit(GameEvents.PLACEMENT_CANCELLED, {
      itemType: this.selectedItemType!
    });

    this.cleanupGhost();
    this.state = 'idle';
    this.selectedItemType = null;
  }

  private isWalkable(tileX: number, tileY: number): boolean {
    if (tileY < 0 || tileY >= this.map.length) return false;
    if (tileX < 0 || tileX >= this.map[0].length) return false;
    return this.map[tileY][tileX] === 1;
  }

  update(_delta: number, _time: number): void {
    if (this.state !== 'placing' || !this.ghostSprite) return;

    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    this.ghostSprite.setPosition(worldPoint.x, worldPoint.y);

    const tileX = Math.floor(worldPoint.x / GAME_CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / GAME_CONFIG.TILE_SIZE);

    if (this.isWalkable(tileX, tileY)) {
      this.ghostSprite.clearTint();
      this.ghostSprite.setAlpha(0.5);
    } else {
      this.ghostSprite.setTint(0xff0000);
      this.ghostSprite.setAlpha(0.3);
    }
  }

  private cleanupGhost(): void {
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
  }

  destroy(): void {
    this.cleanupGhost();
    gameEvents.off(GameEvents.PLACEMENT_STARTED, this.onPlacementStarted);
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.keyboard?.off('keydown-ESC', this.onEscKey);
  }
}
