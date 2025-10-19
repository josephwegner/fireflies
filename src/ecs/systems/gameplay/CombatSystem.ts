import { System, World } from 'ecsy';
import { Combat, CombatState, Health, Target, Position, Velocity, PhysicsBody, FireflyTag, MonsterTag } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { ECSEntity } from '@/types';
import { Vector } from '@/utils';
import { ENTITY_CONFIG } from '@/config';
import { AttackContext } from './attacks/AttackHandler';
import { AttackHandlerRegistry } from './attacks/AttackHandlerRegistry';
import { TagComponent } from 'ecsy';
import { SpatialGrid } from '@/utils';

export class CombatSystem extends System {
  private spatialGrid?: SpatialGrid;

  constructor(world: World, attributes?: any) {
    super(world, attributes);
    AttackHandlerRegistry.initialize();
    if (attributes?.spatialGrid) {
      this.spatialGrid = attributes.spatialGrid;
    }
  }

  execute(delta?: number): void {
    const dt = delta || 16;

    this.queries.combatants.results.forEach(entity => {
      try {
        const combat = entity.getMutableComponent(Combat)!;
        const health = entity.getComponent(Health)!;
        const position = entity.getComponent(Position)!;
        const velocity = entity.getMutableComponent(Velocity)!; // Required by query
        const target = entity.getComponent(Target);

        // Dead entities can't attack
        if (health.isDead) {
          if (target) {
            entity.removeComponent(Target);
          }
          return;
        }

        if (!target) {
          // No target, remain idle
          if (combat.state !== CombatState.IDLE) {
            combat.state = CombatState.IDLE;
            combat.chargeTime = 0;
            combat.attackElapsed = 0;
            combat.recoveryElapsed = 0;
          }
          return;
        }

        const targetEntity = target.target;

        // Validate target
        if (!this.isValidTarget(entity, targetEntity, combat)) {
          entity.removeComponent(Target);
          combat.state = CombatState.IDLE;
          combat.chargeTime = 0;
          return;
        }

        this.updateCombatState(entity, combat, targetEntity, position, velocity, dt);
      } catch (error) {
        console.error('[CombatSystem] Error processing entity:', entity.id, error);
      }
    });
  }

  isValidTarget(attacker: ECSEntity, target: ECSEntity, combat: Combat): boolean {
    // Check if target exists and has required components
    if (!target.alive || !target.hasComponent(Health) || !target.hasComponent(Position)) {
      return false;
    }

    const targetHealth = target.getComponent(Health)!;
    if (targetHealth.isDead) {
      return false;
    }

    // Check if the target has a valid tag
    const targetTags = combat.attackPattern.targetTags || [];
    if (targetTags.length > 0) {
      const targetHasValidTag = Object.values(target.getComponents())
        .some(
          c =>
            c instanceof TagComponent &&
            targetTags.includes(
              c.constructor.name.replace(/Tag$/, '').toLowerCase()
            )
        );
      if (!targetHasValidTag) {
        return false;
      }
    }

    // Check if target is in range
    const attackerPos = attacker.getComponent(Position)!;
    const targetPos = target.getComponent(Position)!;
    
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Vector.length(dx, dy);

    // Get interaction radius based on entity type
    // Use tag value (lowercased, like "firefly", "wisp") to determine interaction radius
    const tagComp = Object.values(attacker.getComponents()).find(
      c => c instanceof TagComponent
    );
    const tag =
      tagComp &&
      tagComp.constructor.name.replace(/Tag$/, '').toLowerCase();

    let interactionRadius = (tag && ENTITY_CONFIG[tag]?.interactionRadius) || 30;

    return distance <= interactionRadius;
  }

  updateCombatState(
    entity: ECSEntity,
    combat: Combat,
    target: ECSEntity,
    position: Position,
    velocity: Velocity,
    dt: number
  ): void {
    switch (combat.state) {
      case CombatState.IDLE:
        // Start charging
        combat.state = CombatState.CHARGING;
        combat.chargeTime = 0;
        break;

      case CombatState.CHARGING:
        combat.chargeTime += dt;
        if (combat.chargeTime >= combat.attackPattern.chargeTime) {
          combat.state = CombatState.ATTACKING;
          combat.attackElapsed = 0;
          combat.hasHit = false;
          gameEvents.emit(GameEvents.ATTACK_STARTED, { attacker: entity, target });
        }
        break;

      case CombatState.ATTACKING:
        // Call onAttackStart on first frame of attacking (for dash attacks, etc.)
        if (combat.attackElapsed === 0) {
          const handler = AttackHandlerRegistry.get(combat.attackPattern.handlerType);
          if (handler?.onAttackStart) {
            const context: AttackContext = {
              attacker: entity,
              combat,
              world: this.world,
              spatialGrid: this.spatialGrid,
              target: target,
              position,
              velocity
            };
            handler.onAttackStart(context);
          }
        }

        combat.attackElapsed += dt;

        // Get and execute attack handler
        const handler = AttackHandlerRegistry.get(combat.attackPattern.handlerType);
        if (handler) {
          const context: AttackContext = {
            attacker: entity,
            combat,
            world: this.world,
            spatialGrid: this.spatialGrid,
            target: target,
            position,
            velocity
          };
          handler.execute(context);
        }

        // Check if attack duration is complete
        if (combat.attackElapsed >= combat.attackPattern.attackDuration) {
          combat.state = CombatState.RECOVERING;
          combat.recoveryElapsed = 0;
          gameEvents.emit(GameEvents.ATTACK_COMPLETED, { attacker: entity });
        }
        break;

      case CombatState.RECOVERING:
        combat.recoveryElapsed += dt;
        if (combat.recoveryElapsed >= combat.attackPattern.recoveryTime) {
          // Recovery complete, back to idle
          combat.state = CombatState.IDLE;
          combat.chargeTime = 0;
          combat.attackElapsed = 0;
          combat.recoveryElapsed = 0;
          combat.hasHit = false;
        }
        break;
    }
  }

  static queries = {
    combatants: {
      components: [Combat, Health, Position, Velocity]
    }
  };
}