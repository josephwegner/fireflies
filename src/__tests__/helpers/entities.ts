import { World } from 'ecsy';
import {
  Position,
  Velocity,
  Path,
  Destination,
  Renderable,
  Health,
  PhysicsBody,
  Combat,
  Target,
  FireflyTag,
  MonsterTag,
  WispTag,
  GoalTag
} from '@/ecs/components';
import { ENTITY_CONFIG } from '@/config';
import { ECSEntity } from '@/types';
import { TEST_POSITIONS, TEST_ENTITY_DEFAULTS } from './constants';

export interface TestEntityOptions {
  x?: number;
  y?: number;
  currentPath?: Array<{ x: number; y: number }>;
  nextPath?: Array<{ x: number; y: number }>;
  direction?: string;
  vx?: number;
  vy?: number;
  radius?: number;
}

export interface TestDestinationOptions {
  x?: number;
  y?: number;
  for?: string[];
}

/**
 * Create a test firefly entity with common defaults
 */
export function createTestFirefly(
  world: World,
  options: TestEntityOptions = {}
): ECSEntity {
  const {
    x = TEST_POSITIONS.FIREFLY_DEFAULT.x,
    y = TEST_POSITIONS.FIREFLY_DEFAULT.y,
    currentPath = [],
    nextPath = [],
    direction = TEST_ENTITY_DEFAULTS.DIRECTION,
    vx = 0,
    vy = 0,
    radius = TEST_ENTITY_DEFAULTS.RADIUS
  } = options;

  const entity = world.createEntity();
  entity.addComponent(Position, { x, y });
  entity.addComponent(Velocity, { vx, vy });
  entity.addComponent(Path, { currentPath, nextPath, direction });

  if (radius !== undefined) {
    entity.addComponent(Renderable, {
      type: 'firefly',
      sprite: 'firefly',
      color: 0xffff00,
      radius
    });
  }

  entity.addComponent(FireflyTag);

  return entity;
}

/**
 * Create a test monster entity with common defaults
 */
export function createTestMonster(
  world: World,
  options: TestEntityOptions = {}
): ECSEntity {
  const {
    x = 100,
    y = 100,
    currentPath = [],
    nextPath = [],
    direction = 'l',
    vx = 0,
    vy = 0,
    radius = 8
  } = options;

  const entity = world.createEntity();
  entity.addComponent(Position, { x, y });
  entity.addComponent(Velocity, { vx, vy });
  entity.addComponent(Path, { currentPath, nextPath, direction });

  if (radius !== undefined) {
    entity.addComponent(Renderable, {
      type: 'monster',
      sprite: 'monster',
      color: 0xff0000,
      radius
    });
  }

  entity.addComponent(MonsterTag);

  return entity;
}

/**
 * Create a test wisp destination with common defaults
 */
export function createTestWisp(
  world: World,
  options: TestDestinationOptions = {}
): ECSEntity {
  const {
    x = 300,
    y = 300,
    for: forTypes = ['firefly']
  } = options;

  const entity = world.createEntity();
  entity.addComponent(Position, { x, y });
  entity.addComponent(Destination, { for: forTypes });
  entity.addComponent(WispTag);

  return entity;
}

/**
 * Create a test goal with common defaults
 */
export function createTestGoal(
  world: World,
  options: TestDestinationOptions = {}
): ECSEntity {
  const {
    x = 500,
    y = 500,
    for: forTypes = ['firefly']
  } = options;

  const entity = world.createEntity();
  entity.addComponent(Position, { x, y });
  entity.addComponent(Destination, { for: forTypes });
  entity.addComponent(GoalTag);

  return entity;
}

/**
 * Create a simple test setup with a firefly and a goal
 */
export function createBasicTestSetup(
  world: World,
  fireflyOptions: TestEntityOptions = {},
  goalOptions: TestDestinationOptions = {}
): { entity: ECSEntity; goal: ECSEntity } {
  const entity = createTestFirefly(world, fireflyOptions);
  const goal = createTestGoal(world, goalOptions);

  return { entity, goal };
}

/**
 * Create a test setup with entity, intermediate destination, and goal
 */
export function createIntermediateTestSetup(
  world: World,
  fireflyOptions: TestEntityOptions = {},
  wispOptions: TestDestinationOptions = {},
  goalOptions: TestDestinationOptions = {}
): { entity: ECSEntity; wisp: ECSEntity; goal: ECSEntity } {
  const entity = createTestFirefly(world, fireflyOptions);
  const wisp = createTestWisp(world, wispOptions);
  const goal = createTestGoal(world, goalOptions);

  return { entity, wisp, goal };
}

// Combat-specific entity factories

export interface CombatEntityOptions extends TestEntityOptions {
  health?: number;
  maxHealth?: number;
  isDead?: boolean;
  mass?: number;
  collisionRadius?: number;
}

/**
 * Create a combat-ready firefly for testing
 */
export function createCombatFirefly(
  world: World,
  options: CombatEntityOptions = {}
): ECSEntity {
  const {
    x = 100,
    y = 100,
    vx = 0,
    vy = 0,
    radius = 5,
    health = 50,
    maxHealth = 50,
    isDead = false,
    mass = 1,
    collisionRadius = 5
  } = options;

  const entity = world.createEntity();
  entity.addComponent(Position, { x, y });
  entity.addComponent(Velocity, { vx, vy });
  entity.addComponent(Health, { currentHealth: health, maxHealth, isDead });
  entity.addComponent(PhysicsBody, { mass, isStatic: false, collisionRadius });
  entity.addComponent(FireflyTag);

  return entity;
}

/**
 * Create a combat-ready monster for testing
 */
export function createCombatMonster(
  world: World,
  options: CombatEntityOptions = {}
): ECSEntity {
  const {
    x = 100,
    y = 100,
    vx = 0,
    vy = 0,
    radius = 8,
    health = 100,
    maxHealth = 100,
    isDead = false,
    mass = 1,
    collisionRadius = 8
  } = options;

  const entity = world.createEntity();
  entity.addComponent(Position, { x, y });
  entity.addComponent(Velocity, { vx, vy });
  entity.addComponent(Health, { currentHealth: health, maxHealth, isDead });
  entity.addComponent(PhysicsBody, { mass, isStatic: false, collisionRadius });
  entity.addComponent(MonsterTag);

  return entity;
}

/**
 * Create a combat-ready attacker with all necessary components
 */
export function createCombatAttacker(
  world: World,
  entityType: 'firefly' | 'monster',
  target: ECSEntity,
  options: CombatEntityOptions = {}
): ECSEntity {
  const entity = entityType === 'firefly' 
    ? createCombatFirefly(world, options)
    : createCombatMonster(world, options);

  entity.addComponent(Target, { target });
  entity.addComponent(Combat, {
    state: options.state ?? CombatState.IDLE,
    chargeTime: 0,
    attackElapsed: 0,
    recoveryElapsed: 0,
    attackPattern: ENTITY_CONFIG[entityType].combat!,
    hasHit: false
  });

  return entity;
}
