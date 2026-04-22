import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { pointToSegmentDistance } from '@/utils';

export class WallBreakingSystem implements GameSystem {
  private wallAttackers: Query<With<Entity, 'wallAttackTarget' | 'position' | 'monsterTag'>>;
  private handleEntityDiedBound: (data: any) => void;

  constructor(private world: GameWorld, _config: Record<string, any>) {
    this.wallAttackers = world.with('wallAttackTarget', 'position', 'monsterTag');

    this.handleEntityDiedBound = (data) => this.handleEntityDied(data);
    gameEvents.on(GameEvents.ENTITY_DIED, this.handleEntityDiedBound);
  }

  destroy(): void {
    gameEvents.off(GameEvents.ENTITY_DIED, this.handleEntityDiedBound);
  }

  update(_delta: number, _time: number): void {
    for (const entity of this.wallAttackers) {
      const wall = entity.wallAttackTarget.wallEntity;

      // Wall no longer valid (destroyed, deactivated, etc.)
      if (!this.world.has(wall) || wall.health?.isDead || !wall.wallBlueprint?.active) {
        this.world.removeComponent(entity, 'wallAttackTarget');
        if (entity.target?.target === wall) {
          this.world.removeComponent(entity, 'target');
        }
        if (entity.path) {
          entity.path.currentPath = [];
          entity.path.goalPath = [];
        }
        continue;
      }

      // If monster has a non-wall combat target (wisp), let that fight finish
      if (entity.target && entity.target.target !== wall) continue;

      // Check if a higher-priority target (wisp) is available
      if (entity.targeting?.potentialTargets.length) {
        const hasNonWallTarget = entity.targeting.potentialTargets.some(
          (t: Entity) => t !== wall
        );
        if (hasNonWallTarget) {
          if (entity.target?.target === wall) {
            this.world.removeComponent(entity, 'target');
          }
          continue;
        }
      }

      const sites = wall.buildable?.sites;
      const dist = sites && sites.length >= 2
        ? pointToSegmentDistance(entity.position, sites[0], sites[1])
        : Math.hypot(entity.position.x - wall.position!.x, entity.position.y - wall.position!.y);

      if (dist > GAME_CONFIG.WALL_ATTACK_RANGE) continue;

      // In range — assign wall as combat target so CombatSystem handles the attack
      if (!entity.target) {
        this.world.addComponent(entity, 'target', { target: wall });
      }
    }
  }

  private handleEntityDied(data: { entity: Entity }): void {
    const { entity } = data;
    if (!entity.wallBlueprint || !entity.wallBlueprintTag) return;

    entity.wallBlueprint.active = false;

    if (entity.position) {
      gameEvents.emit(GameEvents.WALL_DESTROYED, {
        entity,
        position: { x: entity.position.x, y: entity.position.y }
      });
    }
  }
}
