export type { Entity } from '@/ecs/Entity';
export type { GameWorld } from '@/ecs/Entity';

export interface Size {
  width: number;
  height: number;
}

export interface EntityConfig {
  speed: number;
  radius: number;
  sprite: string;
  interactionRadius?: number;
  interactsWith?: readonly string[];
}

export interface GameConfig {
  width: number;
  height: number;
  tileSize: number;
  entities: Record<string, EntityConfig>;
}
