import type { Entity } from '@/ecs/Entity';

export function clearPath(entity: Entity): void {
  if (!entity.path) return;
  entity.path.currentPath = [];
  entity.path.goalPath = [];
}
