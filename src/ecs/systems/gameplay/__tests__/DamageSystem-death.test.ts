import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { DamageSystem } from '../DamageSystem';
import { VictorySystem } from '../VictorySystem';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';

describe('DamageSystem — death', () => {
  let world: GameWorld;
  let system: DamageSystem;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    system = new DamageSystem(world, {});
    // VictorySystem subscribes to gameEvents in its constructor
    new VictorySystem(world, {});
  });

  describe('death handling', () => {
    it('should mark entity as dead when health reaches zero', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 25, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'test', sprite: 'test', color: 0xff0000, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      let diedEventFired = false;
      let capturedEntity: any = null;
      gameEvents.once(GameEvents.ENTITY_DIED, ({ entity, position }) => {
        diedEventFired = true;
        capturedEntity = entity;
        expect(position).toEqual({ x: 100, y: 100 });
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });

      expect(diedEventFired).toBe(true);
      expect(capturedEntity).toBe(target);
      expect(target.health!.isDead).toBe(true);
      expect(target.health!.currentHealth).toBe(0);
    });

    it('should start death animation by setting renderable alpha', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 20, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'test', sprite: 'test', color: 0xff0000, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      let diedEventFired = false;
      gameEvents.once(GameEvents.ENTITY_DIED, () => {
        diedEventFired = true;
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 30
      });

      expect(diedEventFired).toBe(true);
      expect(!!target.renderable).toBe(true);
    });

    it('should not emit death event multiple times for same entity', () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 10, maxHealth: 100, isDead: true },
        position: { x: 100, y: 100 }
      });

      let deathCount = 0;
      gameEvents.on(GameEvents.ENTITY_DIED, () => {
        deathCount++;
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10
      });

      expect(deathCount).toBe(0);
    });
  });

  describe('death animation lifecycle', () => {
    it('should remove entity after death animation duration', async () => {
      const attacker = world.add({});
      const target = world.add({
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'test', sprite: 'test', color: 0xff0000, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 20
      });

      expect(world.has(target)).toBe(true);

      const deathDuration = PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;
      const steps = 10;
      const deltaPerStep = deathDuration / steps;

      for (let i = 0; i <= steps + 1; i++) {
        system.update(deltaPerStep, deltaPerStep);
      }

      expect(world.has(target)).toBe(false);
    });
  });

  describe('structure death animation', () => {
    it('should use longer duration for static structures', () => {
      const attacker = world.add({});
      const structure = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: structure, damage: 10 });

      const normalDuration = PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;
      system.update(normalDuration, normalDuration);
      expect(world.has(structure)).toBe(true);

      system.update(400, 400);
      expect(world.has(structure)).toBe(false);
    });

    it('should flicker alpha during first phase', () => {
      const attacker = world.add({});
      const structure = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: structure, damage: 10 });

      system.update(100, 100);
      const alpha1 = structure.renderable!.alpha;
      system.update(50, 50);
      const alpha2 = structure.renderable!.alpha;

      expect(alpha1).toBeGreaterThanOrEqual(0.3);
      expect(alpha2).toBeGreaterThanOrEqual(0.3);
      expect(alpha1).toBeLessThanOrEqual(1);
    });

    it('should shrink scale during implosion phase', () => {
      const attacker = world.add({});
      const structure = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: structure, damage: 10 });

      system.update(400, 400);
      expect(structure.renderable!.scale).toBeLessThan(1);
      expect(structure.renderable!.scale).toBeGreaterThan(0);
    });
  });

  describe('victory condition', () => {
    it('should trigger victory when all monsters are dead', () => {
      const monster1 = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const monster2 = world.add({
        monsterTag: true,
        health: { currentHealth: 15, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      let victoryFired = false;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryFired = true;
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster1,
        damage: 10
      });

      expect(victoryFired).toBe(false);

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster2,
        damage: 15
      });

      expect(victoryFired).toBe(true);
    });

    it('should not trigger victory when some monsters are still alive', () => {
      const monster1 = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      world.add({
        monsterTag: true,
        health: { currentHealth: 50, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      let victoryFired = false;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryFired = true;
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster1,
        damage: 10
      });

      expect(victoryFired).toBe(false);
    });

    it('should only trigger victory once', () => {
      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      let victoryCount = 0;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryCount++;
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      expect(victoryCount).toBe(1);

      const otherEntity = world.add({
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 150, y: 150 },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: otherEntity,
        damage: 10
      });

      expect(victoryCount).toBe(1);
    });

    it('should not trigger victory if no monsters exist', () => {
      const firefly = world.add({
        fireflyTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      let victoryFired = false;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryFired = true;
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: firefly,
        damage: 10
      });

      expect(victoryFired).toBe(false);
    });
  });

  describe('lodge tenant death', () => {
    it('should kill all tenants when a lodge entity dies', () => {
      const tenant1 = world.add({
        fireflyTag: true,
        health: { currentHealth: 50, maxHealth: 50, isDead: false },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const tenant2 = world.add({
        fireflyTag: true,
        health: { currentHealth: 50, maxHealth: 50, isDead: false },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const attacker = world.add({});
      const lodge = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 },
        lodge: { tenants: [tenant1, tenant2], incoming: [], allowedTeam: 'firefly', maxTenants: 2 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: lodge, damage: 10 });

      expect(tenant1.health!.isDead).toBe(true);
      expect(tenant2.health!.isDead).toBe(true);
      expect(world.has(tenant1)).toBe(false);
      expect(world.has(tenant2)).toBe(false);
      expect(lodge.lodge!.tenants).toHaveLength(0);
      expect(lodge.lodge!.incoming).toHaveLength(0);
    });

    it('should emit ENTITY_DIED for each tenant with lodge position', () => {
      const tenant = world.add({
        fireflyTag: true,
        health: { currentHealth: 50, maxHealth: 50, isDead: false },
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const attacker = world.add({});
      const lodge = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 200, y: 300 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 },
        lodge: { tenants: [tenant], incoming: [], allowedTeam: 'firefly', maxTenants: 1 }
      });

      const diedEvents: any[] = [];
      gameEvents.on(GameEvents.ENTITY_DIED, (data) => diedEvents.push(data));

      gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: lodge, damage: 10 });

      const tenantDeath = diedEvents.find(e => e.entity === tenant);
      expect(tenantDeath).toBeDefined();
      expect(tenantDeath.position).toEqual({ x: 200, y: 300 });
    });

    it('should clear incoming when lodge dies', () => {
      const incoming = world.add({ fireflyTag: true });
      const attacker = world.add({});
      const lodge = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 },
        lodge: { tenants: [], incoming: [incoming], allowedTeam: 'firefly', maxTenants: 1 }
      });

      gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: lodge, damage: 10 });

      expect(lodge.lodge!.incoming).toHaveLength(0);
    });

    it('should skip already-removed tenants gracefully', () => {
      const tenant = world.add({ fireflyTag: true });
      world.remove(tenant);

      const attacker = world.add({});
      const lodge = world.add({
        health: { currentHealth: 10, maxHealth: 500, isDead: false },
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0xB0C4DE, radius: 18,
          alpha: 1, scale: 1, tint: 0xB0C4DE, rotation: 0, rotationSpeed: 0, depth: 40, offsetY: 0
        },
        physicsBody: { mass: 1, isStatic: true, collisionRadius: 45 },
        lodge: { tenants: [tenant], incoming: [], allowedTeam: 'firefly', maxTenants: 1 }
      });

      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, { attacker, target: lodge, damage: 10 });
      }).not.toThrow();
    });
  });

  describe('firefly eviction on victory', () => {
    it('should evict all lodged fireflies when victory is triggered', () => {
      const firefly1 = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const firefly2 = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [firefly1, firefly2], incoming: [] }
      });

      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      expect(wisp.lodge!.tenants).toHaveLength(0);

      expect(!!firefly1.position).toBe(true);
      expect(!!firefly1.velocity).toBe(true);
      expect(!!firefly1.path).toBe(true);

      expect(!!firefly2.position).toBe(true);
      expect(!!firefly2.velocity).toBe(true);
      expect(!!firefly2.path).toBe(true);
    });

    it('should mark evicted fireflies with FleeingToGoalTag', () => {
      const firefly = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [firefly], incoming: [] }
      });

      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      expect(!!firefly.fleeingToGoalTag).toBe(true);
    });

    it('should restore firefly position to lodge position when evicted', () => {
      const lodgeX = 150;
      const lodgeY = 250;

      const firefly = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      world.add({
        position: { x: lodgeX, y: lodgeY },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [firefly], incoming: [] }
      });

      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      expect(firefly.position!.x).toBe(lodgeX);
      expect(firefly.position!.y).toBe(lodgeY);
    });

    it('should not evict non-firefly tenants', () => {
      const firefly = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const lodgedMonster = world.add({
        team: 'monster' as const,
        monsterTag: true,
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [firefly, lodgedMonster], incoming: [] }
      });

      const targetMonster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: targetMonster,
        damage: 10
      });

      expect(wisp.lodge!.tenants).toHaveLength(1);
      expect(wisp.lodge!.tenants[0]).toBe(lodgedMonster);
      expect(!!firefly.position).toBe(true);
      expect(lodgedMonster.position).toBeUndefined();
    });

    it('should handle dead entities gracefully during eviction', () => {
      const livingFirefly = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });

      const deadFirefly = world.add({
        team: 'firefly' as const,
        fireflyTag: true,
        renderable: {
          type: 'firefly', sprite: 'firefly', color: 0xffff00, radius: 5,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        }
      });
      world.remove(deadFirefly);

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 2, tenants: [livingFirefly, deadFirefly], incoming: [] }
      });

      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: monster,
          damage: 10
        });
      }).not.toThrow();

      expect(wisp.lodge!.tenants).toHaveLength(0);
      expect(!!livingFirefly.position).toBe(true);
    });

    it('should handle entities without Renderable component gracefully', () => {
      const firefly = world.add({
        team: 'firefly' as const,
        fireflyTag: true
      });

      const wisp = world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [firefly], incoming: [] }
      });

      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: monster,
          damage: 10
        });
      }).not.toThrow();

      expect(wisp.lodge!.tenants).toHaveLength(0);
    });

    it('should handle empty lodges', () => {
      world.add({
        position: { x: 100, y: 100 },
        renderable: {
          type: 'wisp', sprite: 'wisp', color: 0x0000ff, radius: 10,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 50, offsetY: 0
        },
        lodge: { allowedTeam: 'firefly', maxTenants: 1, tenants: [], incoming: [] }
      });

      const monster = world.add({
        monsterTag: true,
        health: { currentHealth: 10, maxHealth: 100, isDead: false },
        position: { x: 200, y: 200 },
        renderable: {
          type: 'monster', sprite: 'monster', color: 0xff0000, radius: 8,
          alpha: 1, scale: 1, tint: 0xFFFFFF, rotation: 0, rotationSpeed: 0, depth: 100, offsetY: 0
        }
      });

      const attacker = world.add({});

      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: monster,
          damage: 10
        });
      }).not.toThrow();
    });
  });
});
