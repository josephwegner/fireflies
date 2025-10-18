import { System } from 'ecsy';
import { Combat, CombatState, Health, Target, Position, Velocity, PhysicsBody, FireflyTag, MonsterTag } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { ECSEntity } from '@/types';
import { Vector } from '@/utils';
import { ENTITY_CONFIG } from '@/config';
import { AttackHandler, AttackContext } from './attacks/AttackHandler';
import { DashAttackHandler } from './attacks/DashAttackHandler';
import { PulseAttackHandler } from './attacks/PulseAttackHandler';
import { TagComponent } from 'ecsy';

export class CombatSystem extends System {
  private dashHandler = new DashAttackHandler();
  private pulseHandler = new PulseAttackHandler();

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
          this.resetCombatState(combat);
          return;
        }

        // Check if we have a valid target
        if (!target || !this.isValidTarget(entity, target.target, combat)) {
          if (target) {
            entity.removeComponent(Target);
          }
          this.resetCombatState(combat);
          return;
        }

        // Update combat state machine
        this.updateCombatState(entity, combat, target.target, position, velocity, dt);
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
        // Start charging when we have a target
        this.transitionToCharging(combat);
        break;

      case CombatState.CHARGING:
        // Increment charge time
        combat.chargeTime += dt;

        // Check if charge is complete
        if (combat.chargeTime >= combat.attackPattern.chargeTime) {
          this.transitionToAttacking(entity, combat, target, position);
        }
        break;

      case CombatState.ATTACKING:
        // Handle attacking state with attack handlers
        this.handleAttackingState(entity, combat, dt);
        break;

      case CombatState.RECOVERING:
        // Update recovery elapsed time
        combat.recoveryElapsed += dt;

        // Check if recovery is complete
        if (combat.recoveryElapsed >= combat.attackPattern.recoveryTime) {
          this.transitionToIdle(combat);
        }
        break;
    }
  }

  transitionToCharging(combat: Combat): void {
    combat.state = CombatState.CHARGING;
    combat.chargeTime = 0;
  }

  transitionToAttacking(entity: ECSEntity, combat: Combat, target: ECSEntity, position: Position): void {
    combat.state = CombatState.ATTACKING;
    combat.attackElapsed = 0;
    combat.hasHit = false;

    gameEvents.emit(GameEvents.ATTACK_STARTED, {
      entity,
      target,
      attackType: combat.attackPattern.handlerType
    });
  }

  transitionToRecovering(entity: ECSEntity, combat: Combat): void {
    combat.state = CombatState.RECOVERING;
    combat.recoveryElapsed = 0;

    gameEvents.emit(GameEvents.ATTACK_COMPLETED, { entity });
  }

  transitionToIdle(combat: Combat): void {
    combat.state = CombatState.IDLE;
    combat.chargeTime = 0;
    combat.attackElapsed = 0;
    combat.recoveryElapsed = 0;
    combat.hasHit = false;
  }

  resetCombatState(combat: Combat): void {
    combat.state = CombatState.IDLE;
    combat.chargeTime = 0;
    combat.attackElapsed = 0;
    combat.recoveryElapsed = 0;
    combat.hasHit = false;
  }

  handleAttackingState(entity: ECSEntity, combat: Combat, dt: number): void {
    const target = entity.getComponent(Target)?.target;
    if (!target) {
      this.transitionToRecovering(entity, combat);
      return;
    }

    // Get the attack handler based on type
    let handler: AttackHandler | undefined;
    switch (combat.attackPattern.handlerType) {
      case 'dash':
        handler = this.dashHandler;
        break;
      case 'pulse':
        handler = this.pulseHandler;
        break;
      default:
        console.warn(`No handler found for attack type: ${combat.attackPattern.handlerType}`);
        this.transitionToRecovering(entity, combat);
        return;
    }

    // Call onAttackStart once at the very beginning (before incrementing elapsed time)
    if (combat.attackElapsed === 0 && handler.onAttackStart) {
      const context = this.createAttackContext(entity, target, combat, dt);
      handler.onAttackStart(context);
    }

    // Increment elapsed time
    combat.attackElapsed += dt;

    // Execute attack logic every frame
    const context = this.createAttackContext(entity, target, combat, dt);
    handler.execute(context);

    // Transition when attack duration complete
    if (combat.attackElapsed >= combat.attackPattern.attackDuration) {
      if (handler.onAttackEnd) {
        handler.onAttackEnd(context);
      }
      this.transitionToRecovering(entity, combat);
    }
  }

  createAttackContext(
    attacker: ECSEntity,
    target: ECSEntity,
    combat: Combat,
    dt: number
  ): AttackContext {
    return {
      attacker,
      target,
      combat,
      position: attacker.getMutableComponent(Position)!,
      velocity: attacker.getMutableComponent(Velocity)!,
      dt,
      world: this.world
    };
  }

  static queries = {
    combatants: {
      components: [Combat, Health, Position, Velocity]
    },
    enemies: {
      components: [FireflyTag, Position, Health]
    }
  };
}

export class AttackHandlerRegistry {
  private static handlers = new Map<string, AttackHandler>();

  static register(type: string, handler: AttackHandler): void {
    this.handlers.set(type, handler);
  }

  static get(type: string): AttackHandler | undefined {
    return this.handlers.get(type);
  }

  static initialize(): void {
    // Register all attack handlers
    this.register('dash', new DashAttackHandler());
    this.register('pulse', new PulseAttackHandler());
    // Easy to add more:
    // this.register('projectile', new ProjectileAttackHandler());
    // this.register('beam', new BeamAttackHandler());
  }
}

