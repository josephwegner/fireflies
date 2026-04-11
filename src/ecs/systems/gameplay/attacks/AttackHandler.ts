import type { Entity, GameWorld, Combat, Position, Velocity } from '@/ecs/Entity';
import type { SpatialGrid } from '@/utils';

export interface AttackContext {
  attacker: Entity;
  combat: Combat;
  world: GameWorld;
  spatialGrid?: SpatialGrid;
  target?: Entity;
  position?: Position;
  velocity?: Velocity;
  dt?: number;
}

export interface AttackHandler {
  execute(context: AttackContext): void;
  onAttackStart?(context: AttackContext): void;
  onCharging?(context: AttackContext): void;
  onRecovering?(context: AttackContext): void;
  cleanup?(context: AttackContext): void;
}
