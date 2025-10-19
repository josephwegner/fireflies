import { World } from 'ecsy';
import { Combat, Position, Velocity } from '@/ecs/components';
import { ECSEntity } from '@/types';
import { SpatialGrid } from '@/utils';

export interface AttackContext {
  attacker: ECSEntity;
  combat: Combat;
  world: World;
  spatialGrid?: SpatialGrid;
  target?: ECSEntity;
  position?: Position;
  velocity?: Velocity;
}

export interface AttackHandler {
  execute(context: AttackContext): void;
  onAttackStart?(context: AttackContext): void;
}
