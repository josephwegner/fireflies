import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';
import { Vector } from '@/utils';

export class DefeatSystem implements GameSystem {
  private monsters: Query<With<Entity, 'monsterTag' | 'position'>>;
  private monsterGoals: Query<With<Entity, 'goalTag' | 'destination' | 'position'>>;
  private fireflyGoals: Query<With<Entity, 'fireflyGoal'>>;
  private activeFireflies: Query<With<Entity, 'fireflyTag' | 'position'>>;

  private defeated = false;
  private monstersDefeated = false;
  private firefliesToWin: number;

  private handleMonstersDefeatedBound: () => void;
  private handleLevelWonBound: () => void;
  private levelWon = false;

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.firefliesToWin = config.firefliesToWin ?? 1;

    this.monsters = world.with('monsterTag', 'position');
    this.monsterGoals = world.with('goalTag', 'destination', 'position');
    this.fireflyGoals = world.with('fireflyGoal');
    this.activeFireflies = world.with('fireflyTag', 'position');

    this.handleMonstersDefeatedBound = () => { this.monstersDefeated = true; };
    this.handleLevelWonBound = () => { this.levelWon = true; };

    gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, this.handleMonstersDefeatedBound);
    gameEvents.on(GameEvents.LEVEL_WON, this.handleLevelWonBound);
  }

  destroy(): void {
    gameEvents.off(GameEvents.ALL_MONSTERS_DEFEATED, this.handleMonstersDefeatedBound);
    gameEvents.off(GameEvents.LEVEL_WON, this.handleLevelWonBound);
  }

  update(_delta: number, _time: number): void {
    if (this.defeated || this.levelWon) return;

    this.checkMonsterReachedGoal();
    this.checkInsufficientFireflies();
  }

  private checkMonsterReachedGoal(): void {
    for (const goal of this.monsterGoals) {
      if (goal.destination.forTeam !== 'monster') continue;

      for (const monster of this.monsters) {
        const dx = monster.position.x - goal.position.x;
        const dy = monster.position.y - goal.position.y;
        const dist = Vector.length(dx, dy);

        if (dist < PHYSICS_CONFIG.GOAL_ARRIVAL_DISTANCE) {
          this.defeated = true;
          gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });
          return;
        }
      }
    }
  }

  private checkInsufficientFireflies(): void {
    if (!this.monstersDefeated) return;

    const hasActiveFireflies = this.activeFireflies.entities.length > 0;
    if (hasActiveFireflies) return;

    const goalEntity = this.fireflyGoals.entities[0];
    if (!goalEntity) return;

    if (goalEntity.fireflyGoal.currentCount < this.firefliesToWin) {
      this.defeated = true;
      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'insufficient_fireflies' });
    }
  }
}
