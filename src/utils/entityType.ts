import type { Entity, Team } from '@/ecs/Entity';

export function getEntityType(entity: Entity): string | undefined {
  if (entity.fireflyTag) return 'firefly';
  if (entity.monsterTag) return 'monster';
  if (entity.wispTag) return 'wisp';
  if (entity.goalTag) return 'goal';
  return undefined;
}

const UNIT_TEAM_MAP: Record<string, Team> = {
  firefly: 'firefly',
  wisp: 'firefly',
  monster: 'monster',
};

export function teamForUnitType(unitType: string): Team | undefined {
  return UNIT_TEAM_MAP[unitType];
}
