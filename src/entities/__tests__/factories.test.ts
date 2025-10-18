import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'ecsy';
import {
  createFirefly,
  createWisp,
  createMonster,
  createGoal
} from '../factories';
import {
  Position,
  Velocity,
  Path,
  Renderable,
  PhysicsBody,
  Destination,
  Targeting,
  Target,
  Interaction,
  FireflyTag,
  WispTag,
  MonsterTag,
  GoalTag
} from '@/ecs/components';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';

describe('Entity Factories', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Velocity)
      .registerComponent(Path)
      .registerComponent(Renderable)
      .registerComponent(PhysicsBody)
      .registerComponent(Destination)
      .registerComponent(Targeting)
      .registerComponent(Target)
      .registerComponent(Interaction)
      .registerComponent(FireflyTag)
      .registerComponent(WispTag)
      .registerComponent(MonsterTag)
      .registerComponent(GoalTag);
  });

  describe('createFirefly', () => {
    it('should create entity with all required components', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.hasComponent(Position)).toBe(true);
      expect(entity.hasComponent(Velocity)).toBe(true);
      expect(entity.hasComponent(Path)).toBe(true);
      expect(entity.hasComponent(Renderable)).toBe(true);
      expect(entity.hasComponent(PhysicsBody)).toBe(true);
      expect(entity.hasComponent(Interaction)).toBe(true);
      expect(entity.hasComponent(Targeting)).toBe(true);
      expect(entity.hasComponent(FireflyTag)).toBe(true);
    });

    it('should initialize position with jitter', () => {
      const entity = createFirefly(world, 100, 200);
      const pos = entity.getComponent(Position)!;

      expect(pos.x).toBeGreaterThanOrEqual(100);
      expect(pos.x).toBeLessThanOrEqual(100 + PHYSICS_CONFIG.POSITION_JITTER);
      expect(pos.y).toBeGreaterThanOrEqual(200);
      expect(pos.y).toBeLessThanOrEqual(200 + PHYSICS_CONFIG.POSITION_JITTER);
    });

    it('should initialize velocity to zero', () => {
      const entity = createFirefly(world, 100, 200);
      const vel = entity.getComponent(Velocity)!;

      expect(vel.vx).toBe(0);
      expect(vel.vy).toBe(0);
    });

    it('should initialize path with correct direction', () => {
      const entity = createFirefly(world, 100, 200);
      const path = entity.getComponent(Path)!;

      expect(path.currentPath).toEqual([]);
      expect(path.nextPath).toEqual([]);
      expect(path.direction).toBe(ENTITY_CONFIG.firefly.direction);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createFirefly(world, 100, 200);
      const renderable = entity.getComponent(Renderable)!;

      expect(renderable.type).toBe('firefly');
      expect(renderable.sprite).toBe('firefly');
      expect(renderable.color).toBe(ENTITY_CONFIG.firefly.color);
      expect(renderable.radius).toBe(ENTITY_CONFIG.firefly.radius);
    });

    it('should initialize physics body with correct properties', () => {
      const entity = createFirefly(world, 100, 200);
      const physics = entity.getComponent(PhysicsBody)!;

      expect(physics.mass).toBe(ENTITY_CONFIG.firefly.mass);
      expect(physics.isStatic).toBe(ENTITY_CONFIG.firefly.isStatic);
      expect(physics.collisionRadius).toBe(ENTITY_CONFIG.firefly.radius);
    });

    it('should initialize interaction component', () => {
      const entity = createFirefly(world, 100, 200);
      const interaction = entity.getComponent(Interaction)!;

      expect(interaction.interactsWith).toEqual(ENTITY_CONFIG.firefly.interactsWith);
      expect(interaction.interactionRadius).toBe(ENTITY_CONFIG.firefly.interactionRadius);
      expect(typeof interaction.onInteract).toBe('function');
    });

    it('should initialize targeting with empty potential targets', () => {
      const entity = createFirefly(world, 100, 200);
      const targeting = entity.getComponent(Targeting)!;

      expect(targeting.potentialTargets).toEqual([]);
    });

    it('should create multiple fireflies with different positions', () => {
      const entity1 = createFirefly(world, 100, 200);
      const entity2 = createFirefly(world, 300, 400);

      const pos1 = entity1.getComponent(Position)!;
      const pos2 = entity2.getComponent(Position)!;

      expect(pos1.x).not.toBe(pos2.x);
      expect(pos1.y).not.toBe(pos2.y);
    });
  });

  describe('createWisp', () => {
    it('should create entity with all required components', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.hasComponent(Position)).toBe(true);
      expect(entity.hasComponent(Destination)).toBe(true);
      expect(entity.hasComponent(Renderable)).toBe(true);
      expect(entity.hasComponent(PhysicsBody)).toBe(true);
      expect(entity.hasComponent(WispTag)).toBe(true);
    });

    it('should not have movement components', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.hasComponent(Velocity)).toBe(false);
      expect(entity.hasComponent(Path)).toBe(false);
    });

    it('should initialize position without jitter', () => {
      const entity = createWisp(world, 100, 200);
      const pos = entity.getComponent(Position)!;

      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should be a destination for fireflies', () => {
      const entity = createWisp(world, 100, 200);
      const dest = entity.getComponent(Destination)!;

      expect(dest.for).toEqual(['firefly']);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createWisp(world, 100, 200);
      const renderable = entity.getComponent(Renderable)!;

      expect(renderable.type).toBe('wisp');
      expect(renderable.sprite).toBe('wisp');
      expect(renderable.color).toBe(ENTITY_CONFIG.wisp.color);
      expect(renderable.radius).toBe(ENTITY_CONFIG.wisp.radius);
    });

    it('should be static', () => {
      const entity = createWisp(world, 100, 200);
      const physics = entity.getComponent(PhysicsBody)!;

      expect(physics.isStatic).toBe(true);
    });
  });

  describe('createMonster', () => {
    it('should create entity with all required components', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.hasComponent(Position)).toBe(true);
      expect(entity.hasComponent(Velocity)).toBe(true);
      expect(entity.hasComponent(Path)).toBe(true);
      expect(entity.hasComponent(Renderable)).toBe(true);
      expect(entity.hasComponent(PhysicsBody)).toBe(true);
      expect(entity.hasComponent(MonsterTag)).toBe(true);
    });

    it('should not have targeting or interaction components', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.hasComponent(Targeting)).toBe(false);
      expect(entity.hasComponent(Interaction)).toBe(false);
    });

    it('should initialize position with jitter', () => {
      const entity = createMonster(world, 100, 200);
      const pos = entity.getComponent(Position)!;

      expect(pos.x).toBeGreaterThanOrEqual(100);
      expect(pos.x).toBeLessThanOrEqual(100 + PHYSICS_CONFIG.POSITION_JITTER);
      expect(pos.y).toBeGreaterThanOrEqual(200);
      expect(pos.y).toBeLessThanOrEqual(200 + PHYSICS_CONFIG.POSITION_JITTER);
    });

    it('should initialize velocity to zero', () => {
      const entity = createMonster(world, 100, 200);
      const vel = entity.getComponent(Velocity)!;

      expect(vel.vx).toBe(0);
      expect(vel.vy).toBe(0);
    });

    it('should initialize path with correct direction', () => {
      const entity = createMonster(world, 100, 200);
      const path = entity.getComponent(Path)!;

      expect(path.currentPath).toEqual([]);
      expect(path.nextPath).toEqual([]);
      expect(path.direction).toBe(ENTITY_CONFIG.monster.direction);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createMonster(world, 100, 200);
      const renderable = entity.getComponent(Renderable)!;

      expect(renderable.type).toBe('monster');
      expect(renderable.sprite).toBe('monster');
      expect(renderable.color).toBe(ENTITY_CONFIG.monster.color);
      expect(renderable.radius).toBe(ENTITY_CONFIG.monster.radius);
    });

    it('should not be static', () => {
      const entity = createMonster(world, 100, 200);
      const physics = entity.getComponent(PhysicsBody)!;

      expect(physics.isStatic).toBe(false);
    });
  });

  describe('createGoal', () => {
    it('should create entity with all required components', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.hasComponent(Position)).toBe(true);
      expect(entity.hasComponent(Destination)).toBe(true);
      expect(entity.hasComponent(Renderable)).toBe(true);
      expect(entity.hasComponent(PhysicsBody)).toBe(true);
      expect(entity.hasComponent(GoalTag)).toBe(true);
    });

    it('should initialize position without jitter', () => {
      const entity = createGoal(world, 100, 200, 'firefly');
      const pos = entity.getComponent(Position)!;

      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should be a destination for specified entity type', () => {
      const entity = createGoal(world, 100, 200, 'firefly');
      const dest = entity.getComponent(Destination)!;

      expect(dest.for).toEqual(['firefly']);
    });

    it('should accept different attract types', () => {
      const fireflyGoal = createGoal(world, 100, 200, 'firefly');
      const monsterGoal = createGoal(world, 300, 400, 'monster');

      const fireflyDest = fireflyGoal.getComponent(Destination)!;
      const monsterDest = monsterGoal.getComponent(Destination)!;

      expect(fireflyDest.for).toEqual(['firefly']);
      expect(monsterDest.for).toEqual(['monster']);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createGoal(world, 100, 200, 'firefly');
      const renderable = entity.getComponent(Renderable)!;

      expect(renderable.type).toBe('goal');
      expect(renderable.sprite).toBe('goal');
      expect(renderable.color).toBe(ENTITY_CONFIG.goal.color);
      expect(renderable.radius).toBe(ENTITY_CONFIG.goal.radius);
    });

    it('should be static', () => {
      const entity = createGoal(world, 100, 200, 'firefly');
      const physics = entity.getComponent(PhysicsBody)!;

      expect(physics.isStatic).toBe(true);
    });

    it('should have correct mass from config', () => {
      const entity = createGoal(world, 100, 200, 'firefly');
      const physics = entity.getComponent(PhysicsBody)!;

      expect(physics.mass).toBe(ENTITY_CONFIG.goal.mass);
    });
  });

  describe('Entity Configuration Consistency', () => {
    it('all entities should use sprite as type', () => {
      const firefly = createFirefly(world, 0, 0);
      const wisp = createWisp(world, 0, 0);
      const monster = createMonster(world, 0, 0);
      const goal = createGoal(world, 0, 0, 'firefly');

      expect(firefly.getComponent(Renderable)!.sprite).toBe(firefly.getComponent(Renderable)!.type);
      expect(wisp.getComponent(Renderable)!.sprite).toBe(wisp.getComponent(Renderable)!.type);
      expect(monster.getComponent(Renderable)!.sprite).toBe(monster.getComponent(Renderable)!.type);
      expect(goal.getComponent(Renderable)!.sprite).toBe(goal.getComponent(Renderable)!.type);
    });

    it('all entities should have collision radius equal to visual radius', () => {
      const firefly = createFirefly(world, 0, 0);
      const wisp = createWisp(world, 0, 0);
      const monster = createMonster(world, 0, 0);
      const goal = createGoal(world, 0, 0, 'firefly');

      expect(firefly.getComponent(PhysicsBody)!.collisionRadius).toBe(firefly.getComponent(Renderable)!.radius);
      expect(wisp.getComponent(PhysicsBody)!.collisionRadius).toBe(wisp.getComponent(Renderable)!.radius);
      expect(monster.getComponent(PhysicsBody)!.collisionRadius).toBe(monster.getComponent(Renderable)!.radius);
      expect(goal.getComponent(PhysicsBody)!.collisionRadius).toBe(goal.getComponent(Renderable)!.radius);
    });

    it('static entities should not have movement components', () => {
      const wisp = createWisp(world, 0, 0);
      const goal = createGoal(world, 0, 0, 'firefly');

      expect(wisp.hasComponent(Velocity)).toBe(false);
      expect(wisp.hasComponent(Path)).toBe(false);
      expect(goal.hasComponent(Velocity)).toBe(false);
      expect(goal.hasComponent(Path)).toBe(false);
    });

    it('movable entities should have Path component', () => {
      const firefly = createFirefly(world, 0, 0);
      const monster = createMonster(world, 0, 0);

      expect(firefly.hasComponent(Path)).toBe(true);
      expect(monster.hasComponent(Path)).toBe(true);
    });
  });
});
