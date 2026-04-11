import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import {
  createFirefly,
  createWisp,
  createMonster,
  createGoal
} from '../factories';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';

describe('Entity Factories', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new World<Entity>();
  });

  describe('createFirefly', () => {
    it('should create entity with all required components', () => {
      const entity = createFirefly(world, 100, 200);

      expect(!!entity.position).toBe(true);
      expect(!!entity.velocity).toBe(true);
      expect(!!entity.path).toBe(true);
      expect(!!entity.renderable).toBe(true);
      expect(!!entity.physicsBody).toBe(true);
      expect(!!entity.interaction).toBe(true);
      expect(!!entity.targeting).toBe(true);
      expect(!!entity.fireflyTag).toBe(true);
    });

    it('should initialize position with jitter', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.position!.x).toBeGreaterThanOrEqual(100);
      expect(entity.position!.x).toBeLessThanOrEqual(100 + PHYSICS_CONFIG.POSITION_JITTER);
      expect(entity.position!.y).toBeGreaterThanOrEqual(200);
      expect(entity.position!.y).toBeLessThanOrEqual(200 + PHYSICS_CONFIG.POSITION_JITTER);
    });

    it('should initialize velocity to zero', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.velocity!.vx).toBe(0);
      expect(entity.velocity!.vy).toBe(0);
    });

    it('should initialize path with correct direction', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.path!.currentPath).toEqual([]);
      expect(entity.path!.nextPath).toEqual([]);
      expect(entity.path!.direction).toBe(ENTITY_CONFIG.firefly.direction);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.renderable!.type).toBe('firefly');
      expect(entity.renderable!.sprite).toBe('firefly');
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.firefly.color);
      expect(entity.renderable!.radius).toBe(ENTITY_CONFIG.firefly.radius);
    });

    it('should initialize physics body with correct properties', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.physicsBody!.mass).toBe(ENTITY_CONFIG.firefly.mass);
      expect(entity.physicsBody!.isStatic).toBe(ENTITY_CONFIG.firefly.isStatic);
      expect(entity.physicsBody!.collisionRadius).toBe(ENTITY_CONFIG.firefly.radius);
    });

    it('should initialize interaction component', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.interaction!.interactsWith).toEqual(ENTITY_CONFIG.firefly.interactsWith);
      expect(entity.interaction!.interactionRadius).toBe(ENTITY_CONFIG.firefly.interactionRadius);
    });

    it('should initialize targeting with empty potential targets', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.targeting!.potentialTargets).toEqual([]);
    });

    it('should create multiple fireflies with different positions', () => {
      const entity1 = createFirefly(world, 100, 200);
      const entity2 = createFirefly(world, 300, 400);

      expect(entity1.position!.x).not.toBe(entity2.position!.x);
      expect(entity1.position!.y).not.toBe(entity2.position!.y);
    });
  });

  describe('createWisp', () => {
    it('should create entity with all required components', () => {
      const entity = createWisp(world, 100, 200);

      expect(!!entity.position).toBe(true);
      expect(!!entity.destination).toBe(true);
      expect(!!entity.renderable).toBe(true);
      expect(!!entity.physicsBody).toBe(true);
      expect(!!entity.wispTag).toBe(true);
    });

    it('should not have movement components', () => {
      const entity = createWisp(world, 100, 200);

      expect(!!entity.velocity).toBe(false);
      expect(!!entity.path).toBe(false);
    });

    it('should initialize position without jitter', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.position!.x).toBe(100);
      expect(entity.position!.y).toBe(200);
    });

    it('should be a destination for fireflies', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.destination!.for).toEqual(['firefly']);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.renderable!.type).toBe('wisp');
      expect(entity.renderable!.sprite).toBe('wisp');
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.wisp.color);
      expect(entity.renderable!.radius).toBe(ENTITY_CONFIG.wisp.radius);
    });

    it('should be static', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.physicsBody!.isStatic).toBe(true);
    });

    it('should have lodge component with correct configuration', () => {
      const wisp = createWisp(world, 100, 100);

      expect(!!wisp.lodge).toBe(true);
      expect(wisp.lodge!.allowedTenants).toEqual(['firefly']);
      expect(wisp.lodge!.maxTenants).toBe(1);
      expect(wisp.lodge!.tenants).toEqual([]);
    });
  });

  describe('createMonster', () => {
    it('should create entity with all required components', () => {
      const entity = createMonster(world, 100, 200);

      expect(!!entity.position).toBe(true);
      expect(!!entity.velocity).toBe(true);
      expect(!!entity.path).toBe(true);
      expect(!!entity.renderable).toBe(true);
      expect(!!entity.physicsBody).toBe(true);
      expect(!!entity.monsterTag).toBe(true);
    });

    it('should have targeting and interaction components for combat', () => {
      const entity = createMonster(world, 100, 200);

      expect(!!entity.targeting).toBe(true);
      expect(!!entity.interaction).toBe(true);
      expect(!!entity.health).toBe(true);
      expect(!!entity.combat).toBe(true);
    });

    it('should initialize position with jitter', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.position!.x).toBeGreaterThanOrEqual(100);
      expect(entity.position!.x).toBeLessThanOrEqual(100 + PHYSICS_CONFIG.POSITION_JITTER);
      expect(entity.position!.y).toBeGreaterThanOrEqual(200);
      expect(entity.position!.y).toBeLessThanOrEqual(200 + PHYSICS_CONFIG.POSITION_JITTER);
    });

    it('should initialize velocity to zero', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.velocity!.vx).toBe(0);
      expect(entity.velocity!.vy).toBe(0);
    });

    it('should initialize path with correct direction', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.path!.currentPath).toEqual([]);
      expect(entity.path!.nextPath).toEqual([]);
      expect(entity.path!.direction).toBe(ENTITY_CONFIG.monster.direction);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.renderable!.type).toBe('monster');
      expect(entity.renderable!.sprite).toBe('monster1');
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.monster.color);
      expect(entity.renderable!.radius).toBe(ENTITY_CONFIG.monster.radius);
    });

    it('should not be static', () => {
      const entity = createMonster(world, 100, 200);

      expect(entity.physicsBody!.isStatic).toBe(false);
    });
  });

  describe('createGoal', () => {
    it('should create entity with all required components', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(!!entity.position).toBe(true);
      expect(!!entity.destination).toBe(true);
      expect(!!entity.renderable).toBe(true);
      expect(!!entity.physicsBody).toBe(true);
      expect(!!entity.goalTag).toBe(true);
    });

    it('should initialize position without jitter', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.position!.x).toBe(100);
      expect(entity.position!.y).toBe(200);
    });

    it('should be a destination for specified entity type', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.destination!.for).toEqual(['firefly']);
    });

    it('should accept different attract types', () => {
      const fireflyGoal = createGoal(world, 100, 200, 'firefly');
      const monsterGoal = createGoal(world, 300, 400, 'monster');

      expect(fireflyGoal.destination!.for).toEqual(['firefly']);
      expect(monsterGoal.destination!.for).toEqual(['monster']);
    });

    it('should initialize renderable with correct properties', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.renderable!.type).toBe('goal');
      expect(entity.renderable!.sprite).toBe('greattree');
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.goal.color);
    });

    it('should be static', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.physicsBody!.isStatic).toBe(true);
    });

    it('should have correct mass from config', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.physicsBody!.mass).toBe(ENTITY_CONFIG.goal.mass);
    });
  });

  describe('Entity Configuration Consistency', () => {
    it('all movable entities should use sprite field', () => {
      const firefly = createFirefly(world, 0, 0);
      const wisp = createWisp(world, 0, 0);
      const monster = createMonster(world, 0, 0);
      const goal = createGoal(world, 0, 0, 'firefly');

      expect(firefly.renderable!.sprite).toBeDefined();
      expect(wisp.renderable!.sprite).toBeDefined();
      expect(monster.renderable!.sprite).toBeDefined();
      expect(goal.renderable!.sprite).toBeDefined();
    });

    it('all entities should have collision radius equal to visual radius', () => {
      const firefly = createFirefly(world, 0, 0);
      const wisp = createWisp(world, 0, 0);
      const monster = createMonster(world, 0, 0);

      expect(firefly.physicsBody!.collisionRadius).toBe(firefly.renderable!.radius);
      expect(wisp.physicsBody!.collisionRadius).toBe(wisp.renderable!.radius);
      expect(monster.physicsBody!.collisionRadius).toBe(monster.renderable!.radius);
    });

    it('static entities should not have movement components', () => {
      const wisp = createWisp(world, 0, 0);
      const goal = createGoal(world, 0, 0, 'firefly');

      expect(!!wisp.velocity).toBe(false);
      expect(!!wisp.path).toBe(false);
      expect(!!goal.velocity).toBe(false);
      expect(!!goal.path).toBe(false);
    });

    it('movable entities should have path component', () => {
      const firefly = createFirefly(world, 0, 0);
      const monster = createMonster(world, 0, 0);

      expect(!!firefly.path).toBe(true);
      expect(!!monster.path).toBe(true);
    });
  });
});
