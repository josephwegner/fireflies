import type { Entity } from '@/ecs/Entity';

export function getEntityType(entity: Entity): string | undefined {
  if (entity.fireflyTag) return 'firefly';
  if (entity.monsterTag) return 'monster';
  if (entity.wispTag) return 'wisp';
  if (entity.goalTag) return 'goal';
  return undefined;
}
