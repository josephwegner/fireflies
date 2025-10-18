import { World } from 'ecsy';
import { ECSEntity } from '@/types';
import { Combat, Position, Velocity } from '@/ecs/components';

export interface AttackContext {
  attacker: ECSEntity;
  target: ECSEntity;
  combat: Combat;
  position: Position;
  velocity: Velocity;
  dt: number;
  world: World;
}

export interface AttackHandler {
  // Called every frame during ATTACKING state
  execute(context: AttackContext): void;
  
  // Optional: Called when entering ATTACKING state
  onAttackStart?(context: AttackContext): void;
  
  // Optional: Called when exiting ATTACKING state
  onAttackEnd?(context: AttackContext): void;
}
