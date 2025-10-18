import { Entity } from 'ecsy';
import Phaser from 'phaser';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface EntityConfig {
  speed: number;
  radius: number;
  sprite: string;
  interactionRadius?: number;
  interactsWith?: string[];
}

export interface GameConfig {
  width: number;
  height: number;
  tileSize: number;
  entities: Record<string, EntityConfig>;
}

export type ECSEntity = Entity;

export interface SpriteMapping {
  entity: ECSEntity;
  sprite: Phaser.GameObjects.Sprite;
  physicsBody?: Phaser.Physics.Arcade.Body;
}
