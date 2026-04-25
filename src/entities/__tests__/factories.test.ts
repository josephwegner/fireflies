import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';
import {
  createFirefly,
  createWisp,
  createMonster,
  createGoal,
  createSpawner,
  createRedirect,
  createWallBlueprint
} from '../factories';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { ENTITY_CONFIG, PHYSICS_CONFIG, GAME_CONFIG } from '@/config';

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
      expect(entity.path!.goalPath).toEqual([]);
      expect(entity.path!.direction).toBe(ENTITY_CONFIG.firefly.direction);
    });

    it('should initialize renderable from visual config', () => {
      const entity = createFirefly(world, 100, 200);
      const visual = ENTITY_CONFIG.firefly.visual!;

      expect(entity.renderable!.type).toBe('firefly');
      expect(entity.renderable!.sprite).toBe(visual.sprite);
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.firefly.color);
      expect(entity.renderable!.radius).toBe(ENTITY_CONFIG.firefly.radius);
      expect(entity.renderable!.depth).toBe(visual.depth);
      expect(entity.renderable!.rotationSpeed).toBe(visual.rotationSpeed);
      expect(entity.renderable!.tint).toBe(visual.tint);
      expect(entity.renderable!.glow).toEqual(expect.objectContaining({
        radius: visual.glow!.radius,
        color: visual.glow!.color,
        intensity: visual.glow!.intensity
      }));
    });

    it('should initialize trail from visual config', () => {
      const entity = createFirefly(world, 100, 200);
      const trail = ENTITY_CONFIG.firefly.visual!.trail!;

      expect(entity.trail).toBeDefined();
      expect(entity.trail!.config.length).toBe(trail.length);
      expect(entity.trail!.config.fadeTime).toBe(trail.fadeTime);
      expect(entity.trail!.config.color).toBe(trail.color);
      expect(entity.trail!.config.width).toBe(trail.width);
      expect(entity.trail!.config.minAlpha).toBe(trail.minAlpha);
    });

    it('should initialize physics body with correct properties', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.physicsBody!.mass).toBe(ENTITY_CONFIG.firefly.mass);
      expect(entity.physicsBody!.isStatic).toBe(ENTITY_CONFIG.firefly.isStatic);
      expect(entity.physicsBody!.collisionRadius).toBe(ENTITY_CONFIG.firefly.radius);
    });

    it('should initialize interaction component', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.interaction!.interactionRadius).toBe(ENTITY_CONFIG.firefly.interactionRadius);
    });

    it('should have team set to firefly', () => {
      const entity = createFirefly(world, 100, 200);

      expect(entity.team).toBe('firefly');
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

    it('should be a destination for firefly team', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.destination!.forTeam).toBe('firefly');
    });

    it('should initialize renderable from visual config', () => {
      const entity = createWisp(world, 100, 200);
      const visual = ENTITY_CONFIG.wisp.visual!;

      expect(entity.renderable!.type).toBe('wisp');
      expect(entity.renderable!.sprite).toBe(visual.sprite);
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.wisp.color);
      expect(entity.renderable!.radius).toBe(ENTITY_CONFIG.wisp.radius);
      expect(entity.renderable!.depth).toBe(visual.depth);
      expect(entity.renderable!.rotationSpeed).toBe(visual.rotationSpeed);
      expect(entity.renderable!.tint).toBe(visual.tint);
      expect(entity.physicsBody!.collisionRadius).toBe(visual.collisionRadius);
    });

    it('should be static', () => {
      const entity = createWisp(world, 100, 200);

      expect(entity.physicsBody!.isStatic).toBe(true);
    });

    it('should have lodge component with correct configuration', () => {
      const wisp = createWisp(world, 100, 100);

      expect(!!wisp.lodge).toBe(true);
      expect(wisp.lodge!.allowedTeam).toBe('firefly');
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
      expect(entity.path!.goalPath).toEqual([]);
      expect(entity.path!.direction).toBe(ENTITY_CONFIG.monster.direction);
    });

    it('should initialize renderable from visual config', () => {
      const entity = createMonster(world, 100, 200);
      const visual = ENTITY_CONFIG.monster.visual!;

      expect(entity.renderable!.type).toBe('monster');
      expect(entity.renderable!.sprite).toBe(visual.sprite);
      expect(entity.renderable!.color).toBe(ENTITY_CONFIG.monster.color);
      expect(entity.renderable!.radius).toBe(ENTITY_CONFIG.monster.radius);
      expect(entity.renderable!.depth).toBe(visual.depth);
      expect(entity.renderable!.rotationSpeed).toBe(visual.rotationSpeed);
      expect(entity.renderable!.tint).toBe(visual.tint);
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

    it('should be a destination for specified team', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.destination!.forTeam).toBe('firefly');
    });

    it('should accept different teams', () => {
      const fireflyGoal = createGoal(world, 100, 200, 'firefly');
      const monsterGoal = createGoal(world, 300, 400, 'monster');

      expect(fireflyGoal.destination!.forTeam).toBe('firefly');
      expect(monsterGoal.destination!.forTeam).toBe('monster');
    });

    it('should initialize renderable from visual config', () => {
      const fireflyGoal = createGoal(world, 100, 200, 'firefly');
      const monsterGoal = createGoal(world, 300, 400, 'monster');
      const fireflyVisual = ENTITY_CONFIG.goalFirefly.visual!;
      const monsterVisual = ENTITY_CONFIG.goalMonster.visual!;

      expect(fireflyGoal.renderable!.sprite).toBe(fireflyVisual.sprite);
      expect(fireflyGoal.renderable!.radius).toBe(fireflyVisual.spriteRadius);
      expect(fireflyGoal.renderable!.depth).toBe(fireflyVisual.depth);
      expect(fireflyGoal.renderable!.offsetY).toBe(fireflyVisual.offsetY);
      expect(fireflyGoal.renderable!.glow).toBeDefined();

      expect(monsterGoal.renderable!.sprite).toBe(monsterVisual.sprite);
      expect(monsterGoal.renderable!.radius).toBe(monsterVisual.spriteRadius);
      expect(monsterGoal.renderable!.depth).toBe(monsterVisual.depth);
      expect(monsterGoal.renderable!.offsetY).toBe(monsterVisual.offsetY);
      expect(monsterGoal.renderable!.glow).toBeUndefined();
    });

    it('should be static', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.physicsBody!.isStatic).toBe(true);
    });

    it('should have correct mass from config', () => {
      const entity = createGoal(world, 100, 200, 'firefly');

      expect(entity.physicsBody!.mass).toBe(ENTITY_CONFIG.goalFirefly.mass);
    });
  });

  describe('createSpawner', () => {
    it('should create entity with position, spawner, and spawnerTag', () => {
      const queue = [{ unit: 'firefly' as const, delay: 100 }];
      const entity = createSpawner(world, 100, 200, queue);

      expect(entity.position).toEqual({ x: 100, y: 200 });
      expect(entity.spawnerTag).toBe(true);
      expect(entity.spawner).toBeDefined();
    });

    it('should store the queue in the spawner component', () => {
      const queue = [
        { unit: 'firefly' as const, delay: 200 },
        { unit: 'monster' as const, repeat: 3, delayBetween: 500, delay: 100 }
      ];
      const entity = createSpawner(world, 100, 200, queue);

      expect(entity.spawner!.queue).toBe(queue);
    });

    it('should initialize spawner state for immediate first spawn', () => {
      const queue = [{ unit: 'firefly' as const }];
      const entity = createSpawner(world, 100, 200, queue);

      expect(entity.spawner!.state).toEqual({
        currentIndex: 0,
        repeatsDone: 0,
        timer: 0,
        phase: 'spawning'
      });
    });

    it('should initialize as done with empty queue', () => {
      const entity = createSpawner(world, 100, 200, []);

      expect(entity.spawner!.state.phase).toBe('done');
    });

    it('should not have movement components', () => {
      const entity = createSpawner(world, 100, 200, []);

      expect(entity.velocity).toBeUndefined();
      expect(entity.path).toBeUndefined();
    });

    it('should not have renderable or physicsBody', () => {
      const entity = createSpawner(world, 100, 200, []);

      expect(entity.renderable).toBeUndefined();
      expect(entity.physicsBody).toBeUndefined();
    });
  });

  describe('createRedirect', () => {
    it('should create entity with position, redirect, and redirectTag', () => {
      const exits = [
        { x: 200, y: 100, weight: 1 },
        { x: 200, y: 300, weight: 1 }
      ];
      const entity = createRedirect(world, 100, 200, exits, 'firefly');

      expect(entity.position).toEqual({ x: 100, y: 200 });
      expect(entity.redirectTag).toBe(true);
      expect(entity.redirect).toBeDefined();
    });

    it('should store exits and forTeam', () => {
      const exits = [
        { x: 200, y: 100, weight: 2 },
        { x: 200, y: 300, weight: 1 }
      ];
      const entity = createRedirect(world, 100, 200, exits, 'firefly');

      expect(entity.redirect!.exits).toBe(exits);
      expect(entity.redirect!.forTeam).toBe('firefly');
    });

    it('should use default radius of TILE_SIZE * 3 when not specified', () => {
      const exits = [{ x: 200, y: 100, weight: 1 }];
      const entity = createRedirect(world, 100, 200, exits, 'firefly');

      expect(entity.redirect!.radius).toBe(GAME_CONFIG.TILE_SIZE * 3);
    });

    it('should accept custom radius', () => {
      const exits = [{ x: 200, y: 100, weight: 1 }];
      const entity = createRedirect(world, 100, 200, exits, 'firefly', 50);

      expect(entity.redirect!.radius).toBe(50);
    });

    it('should not have renderable or physicsBody', () => {
      const exits = [{ x: 200, y: 100, weight: 1 }];
      const entity = createRedirect(world, 100, 200, exits, 'firefly');

      expect(entity.renderable).toBeUndefined();
      expect(entity.physicsBody).toBeUndefined();
    });

    it('should not have movement components', () => {
      const exits = [{ x: 200, y: 100, weight: 1 }];
      const entity = createRedirect(world, 100, 200, exits, 'firefly');

      expect(entity.velocity).toBeUndefined();
      expect(entity.path).toBeUndefined();
    });
  });

  describe('createWallBlueprint', () => {
    it('should create entity with buildable and wallBlueprint components', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 5);

      expect(entity.buildable).toBeDefined();
      expect(entity.wallBlueprint).toBeDefined();
      expect(entity.wallBlueprintTag).toBe(true);
    });

    it('should position at midpoint of the two nodes', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 50 }, 5);

      expect(entity.position!.x).toBe(50);
      expect(entity.position!.y).toBe(25);
    });

    it('should create two build sites at node positions', () => {
      const entity = createWallBlueprint(world, { x: 10, y: 20 }, { x: 80, y: 90 }, 5);

      expect(entity.buildable!.sites).toHaveLength(2);
      expect(entity.buildable!.sites[0]).toEqual({
        x: 10, y: 20, built: false, buildProgress: 0
      });
      expect(entity.buildable!.sites[1]).toEqual({
        x: 80, y: 90, built: false, buildProgress: 0
      });
    });

    it('should set buildTime and allBuilt=false', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 7);

      expect(entity.buildable!.buildTime).toBe(7);
      expect(entity.buildable!.allBuilt).toBe(false);
    });

    it('should initialize wallBlueprint as inactive', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 5);

      expect(entity.wallBlueprint!.active).toBe(false);
    });

    it('should set passableBy when provided', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 5, 'firefly');

      expect(entity.wallBlueprint!.passableBy).toBe('firefly');
    });

    it('should leave passableBy undefined when not provided', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 5);

      expect(entity.wallBlueprint!.passableBy).toBeUndefined();
    });

    it('should not have renderable component (rendered by WallBlueprintRenderingSystem)', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 5);

      expect(entity.renderable).toBeUndefined();
    });

    it('should not have movement components', () => {
      const entity = createWallBlueprint(world, { x: 0, y: 0 }, { x: 100, y: 0 }, 5);

      expect(entity.velocity).toBeUndefined();
      expect(entity.path).toBeUndefined();
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
      expect(wisp.physicsBody!.collisionRadius).toBe(ENTITY_CONFIG.wisp.visual!.collisionRadius);
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
