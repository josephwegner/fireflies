import { World } from 'ecsy';
import Phaser from 'phaser';
import { Combat, Position, Velocity, Renderable } from '@/ecs/components';
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
  
  // New fields for visual effects
  scene?: Phaser.Scene;
  spriteContainer?: Phaser.GameObjects.Container;
  renderable?: Renderable;
  dt?: number;
}

export interface AttackHandler {
  // Core attack logic
  execute(context: AttackContext): void;
  onAttackStart?(context: AttackContext): void;
  
  // Visual lifecycle methods (all optional)
  onCharging?(context: AttackContext): void;
  onRecovering?(context: AttackContext): void;
  cleanup?(context: AttackContext): void;
}
