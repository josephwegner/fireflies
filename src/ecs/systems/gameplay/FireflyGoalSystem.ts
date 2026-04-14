import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { GAME_CONFIG } from '@/config';
import { logger } from '@/utils/logger';

type GoalEntity = With<Entity, 'fireflyGoal' | 'renderable' | 'position' | 'goalTag'>;

export class FireflyGoalSystem implements GameSystem {
  private fireflyGoals: Query<GoalEntity>;
  private processedFireflies = new Set<Entity>();
  private handlePathCompletedBound: (data: any) => void;
  private firefliesToWin: number;
  private wonEmitted = false;

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.firefliesToWin = config.firefliesToWin ?? 1;
    this.fireflyGoals = world.with('fireflyGoal', 'renderable', 'position', 'goalTag') as any;

    this.handlePathCompletedBound = this.handlePathCompleted.bind(this);
    gameEvents.on(GameEvents.PATH_COMPLETED, this.handlePathCompletedBound);
  }

  destroy(): void {
    gameEvents.off(GameEvents.PATH_COMPLETED, this.handlePathCompletedBound);
  }

  update(_delta: number, _time: number): void {
    this.checkFirefliesNearGoal();

    for (const goalEntity of this.fireflyGoals) {
      this.updateGoalGlow(goalEntity.renderable, goalEntity.fireflyGoal.currentCount);
    }
  }

  private checkFirefliesNearGoal(): void {
    const goalEntity = this.fireflyGoals.entities[0];
    if (!goalEntity) return;

    const goalPosition = goalEntity.position;
    const fireflies = this.world.with('fireflyTag', 'position');

    for (const fireflyEntity of fireflies) {
      if (this.processedFireflies.has(fireflyEntity)) continue;

      const dx = fireflyEntity.position.x - goalPosition.x;
      const dy = fireflyEntity.position.y - goalPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 50) {
        this.collectFirefly(goalEntity, fireflyEntity);
      }
    }
  }

  private handlePathCompleted = (data: { entity: Entity; position: { x: number; y: number } }): void => {
    const { entity, position } = data;

    if (!entity.fireflyTag) return;
    if (this.processedFireflies.has(entity)) return;

    const fireflyGoal = this.fireflyGoals.entities[0];
    if (!fireflyGoal) return;

    const goalPosition = fireflyGoal.position;
    const dx = position.x - goalPosition.x;
    const dy = position.y - goalPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 50) {
      this.collectFirefly(fireflyGoal, entity);
    }
  };

  private collectFirefly(goalEntity: GoalEntity, fireflyEntity: Entity): void {
    goalEntity.fireflyGoal.currentCount++;
    this.processedFireflies.add(fireflyEntity);

    logger.debug('FireflyGoalSystem', `Firefly collected: ${goalEntity.fireflyGoal.currentCount}/${this.firefliesToWin}`);

    this.world.removeComponent(fireflyEntity, 'destination');
    this.world.removeComponent(fireflyEntity, 'path');
    this.world.removeComponent(fireflyEntity, 'renderable');

    if (fireflyEntity.trail) {
      fireflyEntity.trail.enabled = false;
    }

    if (!this.wonEmitted && goalEntity.fireflyGoal.currentCount >= this.firefliesToWin) {
      this.wonEmitted = true;
      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: goalEntity.fireflyGoal.currentCount });
    }
  }

  private updateGoalGlow(renderable: Entity['renderable'] & {}, currentCount: number): void {
    if (!renderable.glow) return;

    const glowConfig = GAME_CONFIG.FIREFLY_GOAL_GLOW;
    const progress = Math.min(currentCount / this.firefliesToWin, 1);
    const easedProgress = this.easeInOutCubic(progress);

    const startR = (glowConfig.startColor >> 16) & 0xFF;
    const startG = (glowConfig.startColor >> 8) & 0xFF;
    const startB = glowConfig.startColor & 0xFF;

    const endR = (glowConfig.endColor >> 16) & 0xFF;
    const endG = (glowConfig.endColor >> 8) & 0xFF;
    const endB = glowConfig.endColor & 0xFF;

    const r = Math.round(startR + (endR - startR) * easedProgress);
    const g = Math.round(startG + (endG - startG) * easedProgress);
    const b = Math.round(startB + (endB - startB) * easedProgress);

    renderable.glow.color = (r << 16) | (g << 8) | b;
    renderable.glow.radius = glowConfig.minRadius + (glowConfig.maxRadius - glowConfig.minRadius) * easedProgress;
    renderable.glow.intensity = glowConfig.minIntensity + (glowConfig.maxIntensity - glowConfig.minIntensity) * easedProgress;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
