import { System, World } from 'ecsy';
import { Combat, CombatState, Health, Target, Position, Velocity, PhysicsBody, FireflyTag, MonsterTag, Renderable } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { ECSEntity } from '@/types';
import { Vector } from '@/utils';
import { ENTITY_CONFIG } from '@/config';
import { AttackContext } from './attacks/AttackHandler';
import { AttackHandlerRegistry } from './attacks/AttackHandlerRegistry';
import { TagComponent } from 'ecsy';
import { SpatialGrid } from '@/utils';
import { RenderingSystem } from '../rendering/RenderingSystem';
import Phaser from 'phaser';

export class CombatSystem extends System {
  private spatialGrid?: SpatialGrid;
  private scene?: Phaser.Scene;
  private renderingSystem?: RenderingSystem;

  constructor(world: World, attributes?: any) {
    super(world, attributes);
    AttackHandlerRegistry.initialize();
    if (attributes?.spatialGrid) {
      this.spatialGrid = attributes.spatialGrid;
    }
    if (attributes?.scene) {
      this.scene = attributes.scene;
    }
    if (attributes?.renderingSystem) {
      this.renderingSystem = attributes.renderingSystem;
    }
  }

  execute(delta?: number): void {
    const dt = delta || 16;

    this.queries.combatants.results.forEach(entity => {
      try {
        const combat = entity.getMutableComponent(Combat)!;
        const health = entity.getComponent(Health)!;
        const position = entity.getComponent(Position)!;
        const velocity = entity.getMutableComponent(Velocity)!;
        const target = entity.getComponent(Target);

        // Dead entities can't attack
        if (health.isDead) {
          if (target) {
            // Cleanup visual effects before removing target
            this.cleanupCombat(entity, combat);
            entity.removeComponent(Target);
          }
          return;
        }

        if (!target) {
          // No target, remain idle
          if (combat.state !== CombatState.IDLE) {
            this.cleanupCombat(entity, combat);
            combat.state = CombatState.IDLE;
            combat.chargeTime = 0;
            combat.attackElapsed = 0;
            combat.recoveryElapsed = 0;
          }
          return;
        }

        const targetEntity = target.target;

        // Only validate target when idle or charging - let attacks/recovery complete
        if (combat.state === CombatState.IDLE || combat.state === CombatState.CHARGING) {
          if (!this.isValidTarget(entity, targetEntity, combat)) {
            this.cleanupCombat(entity, combat);
            entity.removeComponent(Target);
            combat.state = CombatState.IDLE;
            combat.chargeTime = 0;
            return;
          }
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
    const handler = AttackHandlerRegistry.get(combat.attackPattern.handlerType);
    
    switch (combat.state) {
      case CombatState.IDLE:
        // Start charging
        combat.state = CombatState.CHARGING;
        combat.chargeTime = 0;
        break;

      case CombatState.CHARGING:
        // Call visual lifecycle method
        if (handler?.onCharging) {
          const context = this.createAttackContext(entity, combat, target, position, velocity, dt);
          handler.onCharging(context);
        }
        
        combat.chargeTime += dt;
        if (combat.chargeTime >= combat.attackPattern.chargeTime) {
          combat.state = CombatState.ATTACKING;
          combat.attackElapsed = 0;
          combat.hasHit = false;
          gameEvents.emit(GameEvents.ATTACK_STARTED, { attacker: entity, target });
        }
        break;

      case CombatState.ATTACKING:
        // Call onAttackStart on first frame of attacking
        if (combat.attackElapsed === 0) {
          if (handler?.onAttackStart) {
            const context = this.createAttackContext(entity, combat, target, position, velocity, dt);
            handler.onAttackStart(context);
          }
        }

        combat.attackElapsed += dt;

        // Execute attack handler
        if (handler) {
          const context = this.createAttackContext(entity, combat, target, position, velocity, dt);
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
        // Call visual lifecycle method
        if (handler?.onRecovering) {
          const context = this.createAttackContext(entity, combat, target, position, velocity, dt);
          handler.onRecovering(context);
        }
        
        combat.recoveryElapsed += dt;
        if (combat.recoveryElapsed >= combat.attackPattern.recoveryTime) {
          // Recovery complete, cleanup and back to idle
          if (handler?.cleanup) {
            const context = this.createAttackContext(entity, combat, target, position, velocity, dt);
            handler.cleanup(context);
          }
          
          combat.state = CombatState.IDLE;
          combat.chargeTime = 0;
          combat.attackElapsed = 0;
          combat.recoveryElapsed = 0;
          combat.hasHit = false;
        }
        break;
    }
  }

  private createAttackContext(
    entity: ECSEntity,
    combat: Combat,
    target: ECSEntity,
    position: Position,
    velocity: Velocity,
    dt: number
  ): AttackContext {
    const context: AttackContext = {
      attacker: entity,
      combat,
      world: this.world,
      spatialGrid: this.spatialGrid,
      target,
      position,
      velocity,
      dt
    };

    // Add visual context if available
    if (this.scene) {
      context.scene = this.scene;
    }
    if (this.renderingSystem && entity.hasComponent(Renderable)) {
      context.spriteContainer = this.renderingSystem.getSpriteForEntity(entity);
      context.renderable = entity.getMutableComponent(Renderable)!;
    }

    return context;
  }

  private cleanupCombat(entity: ECSEntity, combat: Combat): void {
    const handler = AttackHandlerRegistry.get(combat.attackPattern.handlerType);
    if (handler?.cleanup) {
      const context: AttackContext = {
        attacker: entity,
        combat,
        world: this.world,
        spatialGrid: this.spatialGrid
      };

      if (this.scene) {
        context.scene = this.scene;
      }
      if (this.renderingSystem && entity.hasComponent(Renderable)) {
        context.spriteContainer = this.renderingSystem.getSpriteForEntity(entity);
        context.renderable = entity.getMutableComponent(Renderable)!;
      }

      handler.cleanup(context);
    }
  }

  static queries = {
    combatants: {
      components: [Combat, Health, Position, Velocity]
    }
  };
}