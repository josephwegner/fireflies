import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, CombatState as CombatStateType } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { Vector, SpatialGrid, getEntityType } from '@/utils';
import { ENTITY_CONFIG } from '@/config';
import { pointToSegmentDistance } from '@/utils';
import type { AttackContext, AttackHandler } from './attacks/AttackHandler';
import { DashAttackHandler } from './attacks/DashAttackHandler';
import { PulseAttackHandler } from './attacks/PulseAttackHandler';

type Combatant = With<Entity, 'combat' | 'health' | 'position'>;

export class CombatSystem implements GameSystem {
  private combatants: Query<Combatant>;
  private spatialGrid: SpatialGrid;
  private attackHandlers: Record<string, AttackHandler> = {
    dash: new DashAttackHandler(),
    pulse: new PulseAttackHandler(),
  };

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.combatants = world.with('combat', 'health', 'position');
    this.spatialGrid = config.spatialGrid;
  }

  update(delta: number, _time: number): void {
    const dt = delta || 16;

    for (const entity of this.combatants) {
      try {
        const { combat, health, position } = entity;

        if (health.isDead) {
          if (entity.target) {
            this.cleanupCombat(entity, combat);
            this.world.removeComponent(entity, 'target');
          }
          continue;
        }

        if (!entity.target) {
          if (combat.state !== CombatState.IDLE) {
            this.cleanupCombat(entity, combat);
            combat.state = CombatState.IDLE;
            combat.chargeTime = 0;
            combat.attackElapsed = 0;
            combat.recoveryElapsed = 0;
          }
          continue;
        }

        const targetEntity = entity.target.target;

        if (combat.state === CombatState.IDLE || combat.state === CombatState.CHARGING) {
          if (!this.isValidTarget(entity, targetEntity, combat)) {
            this.world.removeComponent(entity, 'target');

            const hasOtherTargets = entity.targeting && entity.targeting.potentialTargets.length > 0;

            if (combat.state !== CombatState.CHARGING || !hasOtherTargets) {
              this.cleanupCombat(entity, combat);
              combat.state = CombatState.IDLE;
              combat.chargeTime = 0;
            }
            continue;
          }
        }

        this.updateCombatState(entity, combat, targetEntity, dt);
      } catch (error) {
        console.error('[CombatSystem] Error processing entity:', error);
      }
    }
  }

  private isValidTarget(attacker: Entity, target: Entity, combat: Entity['combat']): boolean {
    if (!this.world.has(target) || !target.health || !target.position) {
      return false;
    }

    if (target.health.isDead) return false;

    if (attacker.team && target.team && attacker.team === target.team) return false;

    const attackerPos = attacker.position!;

    let interactionRadius = 30;
    if (attacker.interaction) {
      interactionRadius = attacker.interaction.interactionRadius;
    } else {
      const entityType = getEntityType(attacker);
      interactionRadius = (entityType && ENTITY_CONFIG[entityType]?.interactionRadius) || 30;
    }

    // Wall blueprints are line segments — measure distance to the segment,
    // not the midpoint, so combat works regardless of wall length.
    if (target.wallBlueprintTag && target.buildable?.sites?.length >= 2) {
      const sites = target.buildable.sites;
      return pointToSegmentDistance(attackerPos, sites[0], sites[1]) <= interactionRadius;
    }

    const targetPos = target.position;
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    return Vector.length(dx, dy) <= interactionRadius;
  }

  private updateCombatState(
    entity: Entity,
    combat: Entity['combat'] & {},
    target: Entity,
    dt: number
  ): void {
    const handler = this.attackHandlers[combat.attackPattern.handlerType];

    switch (combat.state) {
      case CombatState.IDLE:
        combat.state = CombatState.CHARGING;
        combat.chargeTime = 0;
        break;

      case CombatState.CHARGING: {
        if (handler?.onCharging) {
          const context = this.createAttackContext(entity, combat, target, dt);
          handler.onCharging(context);
        }
        const progress = combat.chargeTime / combat.attackPattern.chargeTime;
        gameEvents.emit(GameEvents.COMBAT_CHARGING, {
          entity,
          attackPattern: combat.attackPattern,
          progress: Math.min(progress, 1)
        });

        combat.chargeTime += dt;
        if (combat.chargeTime >= combat.attackPattern.chargeTime) {
          combat.state = CombatState.ATTACKING;
          combat.attackElapsed = 0;
          combat.hasHit = false;
          gameEvents.emit(GameEvents.ATTACK_STARTED, { attacker: entity, target });
        }
        break;
      }

      case CombatState.ATTACKING: {
        const isFirstFrame = combat.attackElapsed === 0;

        if (isFirstFrame && handler?.onAttackStart) {
          const context = this.createAttackContext(entity, combat, target, dt);
          handler.onAttackStart(context);
        }

        if (isFirstFrame && entity.position) {
          gameEvents.emit(GameEvents.COMBAT_ATTACK_BURST, {
            entity,
            attackPattern: combat.attackPattern,
            position: { x: entity.position.x, y: entity.position.y }
          });
        }

        combat.attackElapsed += dt;

        if (handler) {
          const context = this.createAttackContext(entity, combat, target, dt);
          handler.execute(context);
        }

        if (combat.attackElapsed >= combat.attackPattern.attackDuration) {
          combat.state = CombatState.RECOVERING;
          combat.recoveryElapsed = 0;
          gameEvents.emit(GameEvents.ATTACK_COMPLETED, { attacker: entity });
        }
        break;
      }

      case CombatState.RECOVERING: {
        if (handler?.onRecovering) {
          const context = this.createAttackContext(entity, combat, target, dt);
          handler.onRecovering(context);
        }
        const progress = combat.recoveryElapsed / combat.attackPattern.recoveryTime;
        gameEvents.emit(GameEvents.COMBAT_RECOVERING, {
          entity,
          attackPattern: combat.attackPattern,
          progress: Math.min(progress, 1)
        });

        combat.recoveryElapsed += dt;
        if (combat.recoveryElapsed >= combat.attackPattern.recoveryTime) {
          if (handler?.cleanup) {
            const context = this.createAttackContext(entity, combat, target, dt);
            handler.cleanup(context);
          }
          gameEvents.emit(GameEvents.COMBAT_CLEANUP, {
            entity,
            attackPattern: combat.attackPattern
          });

          combat.state = CombatState.IDLE;
          combat.chargeTime = 0;
          combat.attackElapsed = 0;
          combat.recoveryElapsed = 0;
          combat.hasHit = false;
        }
        break;
      }
    }
  }

  private createAttackContext(
    entity: Entity,
    combat: Entity['combat'] & {},
    target: Entity,
    dt: number
  ): AttackContext {
    return {
      attacker: entity,
      combat,
      world: this.world,
      spatialGrid: this.spatialGrid,
      target,
      position: entity.position,
      velocity: entity.velocity,
      dt
    };
  }

  private cleanupCombat(entity: Entity, combat: Entity['combat']): void {
    if (!combat) return;
    const handler = this.attackHandlers[combat.attackPattern.handlerType];
    if (handler?.cleanup) {
      const context: AttackContext = {
        attacker: entity,
        combat,
        world: this.world,
        spatialGrid: this.spatialGrid
      };
      handler.cleanup(context);
    }
    gameEvents.emit(GameEvents.COMBAT_CLEANUP, {
      entity,
      attackPattern: combat.attackPattern
    });
  }
}
