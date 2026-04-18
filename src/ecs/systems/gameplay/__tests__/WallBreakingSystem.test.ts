import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { WallBreakingSystem } from '../WallBreakingSystem';
import { GAME_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';

function createMonster(world: GameWorld, x: number, y: number): Entity {
  return world.add({
    position: { x, y },
    velocity: { vx: 0, vy: 0 },
    path: { currentPath: [], goalPath: [], direction: 'l' },
    team: 'monster',
    monsterTag: true
  });
}

function createActiveWall(world: GameWorld, x: number, y: number): Entity {
  return world.add({
    position: { x, y },
    buildable: {
      sites: [
        { x: x - 20, y, built: true, buildProgress: 1 },
        { x: x + 20, y, built: true, buildProgress: 1 }
      ],
      buildTime: 2,
      allBuilt: true
    },
    wallBlueprint: { active: true },
    wallBlueprintTag: true,
    health: { currentHealth: GAME_CONFIG.WALL_HP, maxHealth: GAME_CONFIG.WALL_HP, isDead: false },
    team: 'firefly',
    physicsBody: { collisionRadius: GAME_CONFIG.WALL_BLUEPRINT_THICKNESS / 2, mass: 0, isStatic: true }
  });
}

describe('WallBreakingSystem', () => {
  let world: GameWorld;
  let system: WallBreakingSystem;

  beforeEach(() => {
    world = new World<Entity>();
    system = new WallBreakingSystem(world, {});
  });

  afterEach(() => {
    system.destroy();
    gameEvents.clear();
  });

  describe('target assignment', () => {
    it('should assign wall as combat target when monster is in range', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system.update(16, 0);

      expect(monster.target).toBeDefined();
      expect(monster.target!.target).toBe(wall);
    });

    it('should not assign target when monster is outside range', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 400, 400);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system.update(16, 0);

      expect(monster.target).toBeUndefined();
    });

    it('should not reassign target when already targeting the wall', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system.update(16, 0);
      expect(monster.target!.target).toBe(wall);

      // Second update should not throw or change target
      system.update(16, 0);
      expect(monster.target!.target).toBe(wall);
    });
  });

  describe('wall destruction via ENTITY_DIED', () => {
    it('should emit WALL_DESTROYED when a wall entity dies', () => {
      const wall = createActiveWall(world, 200, 200);

      let destroyed = false;
      gameEvents.on(GameEvents.WALL_DESTROYED, () => { destroyed = true; });

      gameEvents.emit(GameEvents.ENTITY_DIED, { entity: wall, position: { x: 200, y: 200 } });

      expect(destroyed).toBe(true);
    });

    it('should deactivate wall before emitting WALL_DESTROYED', () => {
      const wall = createActiveWall(world, 200, 200);

      let activeAtDestroy: boolean | undefined;
      gameEvents.on(GameEvents.WALL_DESTROYED, (data) => {
        activeAtDestroy = data.entity.wallBlueprint?.active;
      });

      gameEvents.emit(GameEvents.ENTITY_DIED, { entity: wall, position: { x: 200, y: 200 } });

      expect(activeAtDestroy).toBe(false);
    });

    it('should not emit WALL_DESTROYED for non-wall entities', () => {
      const wisp = world.add({ position: { x: 100, y: 100 }, health: { currentHealth: 0, maxHealth: 50, isDead: true } });

      let destroyed = false;
      gameEvents.on(GameEvents.WALL_DESTROYED, () => { destroyed = true; });

      gameEvents.emit(GameEvents.ENTITY_DIED, { entity: wisp, position: { x: 100, y: 100 } });

      expect(destroyed).toBe(false);
    });
  });

  describe('combat priority', () => {
    it('should not assign wall target when monster has a non-wall combat target', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      const wisp = world.add({ position: { x: 190, y: 190 } });
      world.addComponent(monster, 'target', { target: wisp });

      system.update(16, 0);

      expect(monster.target!.target).toBe(wisp);
    });

    it('should drop wall target when higher-priority target is available', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      // Monster is currently targeting the wall
      world.addComponent(monster, 'target', { target: wall });

      // A wisp appears in potential targets
      const wisp = world.add({ position: { x: 190, y: 190 } });
      world.addComponent(monster, 'targeting', { potentialTargets: [wisp] });

      system.update(16, 0);

      // Wall target should be removed so TargetingSystem can assign the wisp
      expect(monster.target).toBeUndefined();
    });
  });

  describe('invalid wall cleanup', () => {
    it('should remove wallAttackTarget when wall entity is removed', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      world.remove(wall);
      system.update(16, 0);

      expect(monster.wallAttackTarget).toBeUndefined();
    });

    it('should remove wallAttackTarget when wall is deactivated', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      wall.wallBlueprint!.active = false;
      system.update(16, 0);

      expect(monster.wallAttackTarget).toBeUndefined();
    });

    it('should also remove combat target when wall becomes invalid', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });
      world.addComponent(monster, 'target', { target: wall });

      wall.wallBlueprint!.active = false;
      system.update(16, 0);

      expect(monster.wallAttackTarget).toBeUndefined();
      expect(monster.target).toBeUndefined();
    });

    it('should clear paths when wallAttackTarget is removed so entity repaths', () => {
      const wall = createActiveWall(world, 200, 200);
      const monster = createMonster(world, 200, 200);
      monster.path!.currentPath = [{ x: 300, y: 300 }];
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      world.remove(wall);
      system.update(16, 0);

      expect(monster.path!.currentPath).toEqual([]);
      expect(monster.path!.goalPath).toEqual([]);
    });

    it('should remove wallAttackTarget when wall health is marked dead', () => {
      const wall = createActiveWall(world, 200, 200);
      wall.health!.isDead = true;

      const monster = createMonster(world, 200, 200);
      world.addComponent(monster, 'wallAttackTarget', {
        wallEntity: wall,
        attackCooldown: 0,
        triedWalls: new Set()
      });

      system.update(16, 0);

      expect(monster.wallAttackTarget).toBeUndefined();
    });
  });
});
