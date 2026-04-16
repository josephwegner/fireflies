import { World } from 'miniplex';
import type { Entity, GameWorld, SpawnEntry, RedirectExit, Team } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import { ENTITY_CONFIG, GAME_CONFIG } from '@/config';
import { TEST_POSITIONS, TEST_ENTITY_DEFAULTS } from './constants';

export interface TestEntityOptions {
  x?: number;
  y?: number;
  currentPath?: Array<{ x: number; y: number }>;
  goalPath?: Array<{ x: number; y: number }>;
  direction?: string;
  vx?: number;
  vy?: number;
  radius?: number;
}

export interface TestDestinationOptions {
  x?: number;
  y?: number;
  for?: Team;
}

export function createTestFirefly(
  world: GameWorld,
  options: TestEntityOptions = {}
): Entity {
  const {
    x = TEST_POSITIONS.FIREFLY_DEFAULT.x,
    y = TEST_POSITIONS.FIREFLY_DEFAULT.y,
    currentPath = [],
    goalPath = [],
    direction = TEST_ENTITY_DEFAULTS.DIRECTION,
    vx = 0,
    vy = 0,
    radius = TEST_ENTITY_DEFAULTS.RADIUS
  } = options;

  return world.add({
    position: { x, y },
    velocity: { vx, vy },
    path: { currentPath, goalPath, direction },
    renderable: {
      type: 'firefly',
      sprite: 'firefly',
      color: 0xffff00,
      radius,
      alpha: 1,
      scale: 1,
      tint: 0xFFFFFF,
      rotation: 0,
      rotationSpeed: 0,
      depth: 50,
      offsetY: 0
    },
    team: 'firefly',
    fireflyTag: true
  });
}

export function createTestMonster(
  world: GameWorld,
  options: TestEntityOptions = {}
): Entity {
  const {
    x = 100,
    y = 100,
    currentPath = [],
    goalPath = [],
    direction = 'l',
    vx = 0,
    vy = 0,
    radius = 8
  } = options;

  return world.add({
    position: { x, y },
    velocity: { vx, vy },
    path: { currentPath, goalPath, direction },
    renderable: {
      type: 'monster',
      sprite: 'monster',
      color: 0xff0000,
      radius,
      alpha: 1,
      scale: 1,
      tint: 0xFFFFFF,
      rotation: 0,
      rotationSpeed: 0,
      depth: 100,
      offsetY: 0
    },
    team: 'monster',
    monsterTag: true
  });
}

export function createTestWisp(
  world: GameWorld,
  options: TestDestinationOptions = {}
): Entity {
  const {
    x = 300,
    y = 300,
    for: forTeam = 'firefly'
  } = options;

  return world.add({
    position: { x, y },
    destination: { forTeam },
    team: forTeam,
    wispTag: true,
    lodge: { tenants: [], incoming: [], allowedTeam: forTeam, maxTenants: 1 }
  });
}

export function createTestGoal(
  world: GameWorld,
  options: TestDestinationOptions = {}
): Entity {
  const {
    x = 500,
    y = 500,
    for: forTeam = 'firefly'
  } = options;

  return world.add({
    position: { x, y },
    destination: { forTeam },
    goalTag: true
  });
}

export function createBasicTestSetup(
  world: GameWorld,
  fireflyOptions: TestEntityOptions = {},
  goalOptions: TestDestinationOptions = {}
): { entity: Entity; goal: Entity } {
  const entity = createTestFirefly(world, fireflyOptions);
  const goal = createTestGoal(world, goalOptions);
  return { entity, goal };
}

export function createIntermediateTestSetup(
  world: GameWorld,
  fireflyOptions: TestEntityOptions = {},
  wispOptions: TestDestinationOptions = {},
  goalOptions: TestDestinationOptions = {}
): { entity: Entity; wisp: Entity; goal: Entity } {
  const entity = createTestFirefly(world, fireflyOptions);
  const wisp = createTestWisp(world, wispOptions);
  const goal = createTestGoal(world, goalOptions);
  return { entity, wisp, goal };
}

export interface TestSpawnerOptions {
  x?: number;
  y?: number;
  queue?: SpawnEntry[];
}

export function createTestSpawner(
  world: GameWorld,
  options: TestSpawnerOptions = {}
): Entity {
  const { x = 200, y = 200, queue = [] } = options;
  return world.add({
    position: { x, y },
    spawner: {
      queue,
      state: { currentIndex: 0, repeatsDone: 0, timer: 0, phase: queue.length > 0 ? 'spawning' as const : 'done' as const }
    },
    spawnerTag: true
  });
}

export interface TestRedirectOptions {
  x?: number;
  y?: number;
  exits?: RedirectExit[];
  for?: Team;
  radius?: number;
}

export function createTestRedirect(
  world: GameWorld,
  options: TestRedirectOptions = {}
): Entity {
  const {
    x = 200,
    y = 200,
    exits = [
      { x: 200, y: 100, weight: 1 },
      { x: 200, y: 300, weight: 1 }
    ],
    for: forTeam = 'firefly',
    radius = GAME_CONFIG.TILE_SIZE * 3
  } = options;

  return world.add({
    position: { x, y },
    redirect: { exits, radius, forTeam },
    redirectTag: true
  });
}

export interface CombatEntityOptions extends TestEntityOptions {
  health?: number;
  maxHealth?: number;
  isDead?: boolean;
  mass?: number;
  collisionRadius?: number;
  state?: CombatState;
}

export function createCombatFirefly(
  world: GameWorld,
  options: CombatEntityOptions = {}
): Entity {
  const {
    x = 100, y = 100, vx = 0, vy = 0,
    health = 50, maxHealth = 50, isDead = false,
    mass = 1, collisionRadius = 5
  } = options;

  return world.add({
    position: { x, y },
    velocity: { vx, vy },
    health: { currentHealth: health, maxHealth, isDead },
    physicsBody: { mass, isStatic: false, collisionRadius },
    team: 'firefly',
    fireflyTag: true
  });
}

export function createCombatMonster(
  world: GameWorld,
  options: CombatEntityOptions = {}
): Entity {
  const {
    x = 100, y = 100, vx = 0, vy = 0,
    health = 100, maxHealth = 100, isDead = false,
    mass = 1, collisionRadius = 8
  } = options;

  return world.add({
    position: { x, y },
    velocity: { vx, vy },
    health: { currentHealth: health, maxHealth, isDead },
    physicsBody: { mass, isStatic: false, collisionRadius },
    team: 'monster',
    monsterTag: true
  });
}

export function createCombatAttacker(
  world: GameWorld,
  entityType: 'firefly' | 'monster',
  target: Entity,
  options: CombatEntityOptions = {}
): Entity {
  const entity = entityType === 'firefly'
    ? createCombatFirefly(world, options)
    : createCombatMonster(world, options);

  world.addComponent(entity, 'target', { target });
  world.addComponent(entity, 'combat', {
    state: options.state ?? CombatState.IDLE,
    chargeTime: 0,
    attackElapsed: 0,
    recoveryElapsed: 0,
    attackPattern: ENTITY_CONFIG[entityType].combat! as any,
    hasHit: false
  });

  return entity;
}
