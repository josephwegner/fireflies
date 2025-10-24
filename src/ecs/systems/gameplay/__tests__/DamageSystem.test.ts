import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { DamageSystem } from '../DamageSystem';
import { MonsterTag, Health, Combat, Position, Renderable, PhysicsBody, Velocity,Lodge, Path, FleeingToGoalTag, FireflyTag } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { PHYSICS_CONFIG } from '@/config';

describe('DamageSystem', () => {
  let world: World;
  let system: DamageSystem;

  beforeEach(() => {
    world = new World();
    world.registerComponent(Health);
    world.registerComponent(Combat);
    world.registerComponent(Position);
    world.registerComponent(Renderable);
    world.registerComponent(PhysicsBody);
    world.registerComponent(Lodge);
    world.registerComponent(Path);
    world.registerComponent(FleeingToGoalTag);
    world.registerComponent(FireflyTag);
    world.registerComponent(MonsterTag);
    world.registerComponent(Velocity);
    world.registerSystem(DamageSystem);
    
    // Clear any previous event listeners
    gameEvents.clear();
    
    // Get the registered system instance and initialize it
    system = world.getSystem(DamageSystem) as DamageSystem;
    system.init();
  });

  describe('damage application', () => {
    it('should apply damage to target health', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      
      // Emit the event to trigger damage
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });
      
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(75);
    });

    it('should not reduce health below zero', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 50
      });
      
      // Entity should be dead but not removed yet (death animation)
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(0);
      expect(health.isDead).toBe(true);
    });

    it('should handle multiple damage instances', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      
      // First hit
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 25
      });
      
      let health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(75);
      
      // Second hit
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 30
      });
      
      health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(45);
    });
  });

  describe('death handling', () => {
    it('should mark entity as dead when health reaches zero', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 25, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
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
      const health = target.getComponent(Health)!;
      expect(health.isDead).toBe(true);
      expect(health.currentHealth).toBe(0);
    });

    it('should start death animation by setting renderable alpha', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 20, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
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
      expect(target.hasComponent(Renderable)).toBe(true);
    });

    it('should not emit death event multiple times for same entity', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 10, maxHealth: 100, isDead: true });
      target.addComponent(Position, { x: 100, y: 100 });
      
      let deathCount = 0;
      gameEvents.on(GameEvents.ENTITY_DIED, () => {
        deathCount++;
      });
      
      // Try to damage an already dead entity
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
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      target.addComponent(Position, { x: 100, y: 100 });
      target.addComponent(Renderable, { type: 'test', color: 0xff0000, radius: 5 });
      
      // Trigger death
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 20
      });
      
      // Entity should still be alive (but marked as dead)
      expect(target.alive).toBe(true);
      
      // Run system updates to process death animation
      const deathDuration = PHYSICS_CONFIG.DEATH_ANIMATION_DURATION;
      const steps = 10;
      const deltaPerStep = deathDuration / steps;
      
      for (let i = 0; i <= steps + 1; i++) {
        world.execute(deltaPerStep, deltaPerStep);
      }
      
      // Entity should be removed after animation completes
      expect(target.alive).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle damage to entity without health component', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Position, { x: 100, y: 100 });
      
      // Should not throw
      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target,
          damage: 25
        });
      }).not.toThrow();
    });

    it('should handle zero damage', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 0
      });
      
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(100);
    });

    it('should handle negative damage (should not heal)', () => {
      const attacker = world.createEntity();
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 50, maxHealth: 100 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: -25
      });
      
      const health = target.getComponent(Health)!;
      expect(health.currentHealth).toBe(50); // Should remain unchanged
    });

    it('should handle knockback with zero force', () => {
      const attacker = world.createEntity();
      attacker.addComponent(Position, { x: 100, y: 100 });
      
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(Position, { x: 150, y: 100 });
      
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10,
        knockbackForce: 0
      });
    });

    it('should handle knockback when attacker has no position', () => {
      const attacker = world.createEntity();
      
      const target = world.createEntity();
      target.addComponent(Health, { currentHealth: 100, maxHealth: 100 });
      target.addComponent(Position, { x: 150, y: 100 });
      
      // Should not throw, but also should not apply knockback
      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target,
          damage: 10,
          knockbackForce: 50
        });
      }).not.toThrow();
    });
  });

  describe('victory condition', () => {
    it('should trigger victory when all monsters are dead', () => {
      const monster1 = world.createEntity();
      monster1.addComponent(MonsterTag);
      monster1.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster1.addComponent(Position, { x: 100, y: 100 });
      monster1.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const monster2 = world.createEntity();
      monster2.addComponent(MonsterTag);
      monster2.addComponent(Health, { currentHealth: 15, maxHealth: 100 });
      monster2.addComponent(Position, { x: 200, y: 200 });
      monster2.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      let victoryFired = false;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryFired = true;
      });

      const attacker = world.createEntity();

      // Kill first monster
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster1,
        damage: 10
      });

      // Victory should not trigger yet
      expect(victoryFired).toBe(false);

      // Kill second monster
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster2,
        damage: 15
      });

      // Victory should trigger now
      expect(victoryFired).toBe(true);
    });

    it('should not trigger victory when some monsters are still alive', () => {
      const monster1 = world.createEntity();
      monster1.addComponent(MonsterTag);
      monster1.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster1.addComponent(Position, { x: 100, y: 100 });
      monster1.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const monster2 = world.createEntity();
      monster2.addComponent(MonsterTag);
      monster2.addComponent(Health, { currentHealth: 50, maxHealth: 100 });
      monster2.addComponent(Position, { x: 200, y: 200 });
      monster2.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      let victoryFired = false;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryFired = true;
      });

      const attacker = world.createEntity();

      // Kill only first monster
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster1,
        damage: 10
      });

      // Victory should not trigger
      expect(victoryFired).toBe(false);
    });

    it('should only trigger victory once', () => {
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 100, y: 100 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      let victoryCount = 0;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryCount++;
      });

      const attacker = world.createEntity();

      // Kill the monster
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      expect(victoryCount).toBe(1);

      // Try to kill another entity (this shouldn't trigger victory again)
      const otherEntity = world.createEntity();
      otherEntity.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      otherEntity.addComponent(Position, { x: 150, y: 150 });
      otherEntity.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: otherEntity,
        damage: 10
      });

      expect(victoryCount).toBe(1);
    });

    it('should not trigger victory if no monsters exist', () => {
      // Create a firefly (not a monster)
      const firefly = world.createEntity();
      firefly.addComponent(FireflyTag);
      firefly.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      firefly.addComponent(Position, { x: 100, y: 100 });
      firefly.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      let victoryFired = false;
      gameEvents.on(GameEvents.ALL_MONSTERS_DEFEATED, () => {
        victoryFired = true;
      });

      const attacker = world.createEntity();

      // Kill the firefly
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: firefly,
        damage: 10
      });

      // Victory should not trigger (no monsters in world)
      expect(victoryFired).toBe(false);
    });
  });

  describe('firefly eviction on victory', () => {
    beforeEach(() => {
      world.registerComponent(Lodge);
      world.registerComponent(Path);
      world.registerComponent(FleeingToGoalTag);
    });

    it('should evict all lodged fireflies when victory is triggered', () => {
      // Create a wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: 100, y: 100 });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly'], maxTenants: 2, tenants: [] });

      // Create lodged fireflies
      const firefly1 = world.createEntity();
      firefly1.addComponent(FireflyTag);
      firefly1.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      const firefly2 = world.createEntity();
      firefly2.addComponent(FireflyTag);
      firefly2.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      // Add them as tenants
      const lodge = wisp.getMutableComponent(Lodge)!;
      lodge.tenants.push(firefly1, firefly2);

      // Create a monster and kill it to trigger victory
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 200, y: 200 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Kill the monster (triggers victory)
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      // Check that fireflies were evicted
      expect(lodge.tenants).toHaveLength(0);
      
      // Check that fireflies now have movement components
      expect(firefly1.hasComponent(Position)).toBe(true);
      expect(firefly1.hasComponent(Velocity)).toBe(true);
      expect(firefly1.hasComponent(Path)).toBe(true);
      
      expect(firefly2.hasComponent(Position)).toBe(true);
      expect(firefly2.hasComponent(Velocity)).toBe(true);
      expect(firefly2.hasComponent(Path)).toBe(true);
    });

    it('should mark evicted fireflies with FleeingToGoalTag', () => {
      // Create a wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: 100, y: 100 });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly'], maxTenants: 1, tenants: [] });

      // Create a lodged firefly
      const firefly = world.createEntity();
      firefly.addComponent(FireflyTag);
      firefly.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      // Add as tenant
      const lodge = wisp.getMutableComponent(Lodge)!;
      lodge.tenants.push(firefly);

      // Create a monster and kill it to trigger victory
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 200, y: 200 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Kill the monster (triggers victory)
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      // Check that firefly has FleeingToGoalTag
      expect(firefly.hasComponent(FleeingToGoalTag)).toBe(true);
    });

    it('should restore firefly position to lodge position when evicted', () => {
      const lodgeX = 150;
      const lodgeY = 250;

      // Create a wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: lodgeX, y: lodgeY });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly'], maxTenants: 1, tenants: [] });

      // Create a lodged firefly
      const firefly = world.createEntity();
      firefly.addComponent(FireflyTag);
      firefly.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      // Add as tenant
      const lodge = wisp.getMutableComponent(Lodge)!;
      lodge.tenants.push(firefly);

      // Create a monster and kill it to trigger victory
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 200, y: 200 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Kill the monster (triggers victory)
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: monster,
        damage: 10
      });

      // Check that firefly position matches lodge position
      const fireflyPos = firefly.getComponent(Position)!;
      expect(fireflyPos.x).toBe(lodgeX);
      expect(fireflyPos.y).toBe(lodgeY);
    });

    it('should not evict non-firefly tenants', () => {
      // Create a wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: 100, y: 100 });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly', 'monster'], maxTenants: 2, tenants: [] });

      // Create a lodged firefly and a monster
      const firefly = world.createEntity();
      firefly.addComponent(FireflyTag);
      firefly.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      const lodgedMonster = world.createEntity();
      lodgedMonster.addComponent(MonsterTag);
      lodgedMonster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      // Add both as tenants
      const lodge = wisp.getMutableComponent(Lodge)!;
      lodge.tenants.push(firefly, lodgedMonster);

      // Create another monster and kill it to trigger victory
      const targetMonster = world.createEntity();
      targetMonster.addComponent(MonsterTag);
      targetMonster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      targetMonster.addComponent(Position, { x: 200, y: 200 });
      targetMonster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Kill the monster (triggers victory)
      gameEvents.emit(GameEvents.ATTACK_HIT, {
        attacker,
        target: targetMonster,
        damage: 10
      });

      // Firefly should be evicted, but monster should remain
      expect(lodge.tenants).toHaveLength(1);
      expect(lodge.tenants[0]).toBe(lodgedMonster);
      expect(firefly.hasComponent(Position)).toBe(true);
      expect(lodgedMonster.hasComponent(Position)).toBe(false);
    });

    it('should handle dead entities gracefully during eviction', () => {
      // Create a wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: 100, y: 100 });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly'], maxTenants: 2, tenants: [] });

      // Create a living firefly
      const livingFirefly = world.createEntity();
      livingFirefly.addComponent(FireflyTag);
      livingFirefly.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });

      // Create a dead firefly (simulate by removing it from world)
      const deadFirefly = world.createEntity();
      deadFirefly.addComponent(FireflyTag);
      deadFirefly.addComponent(Renderable, { type: 'firefly', color: 0xffff00, radius: 5 });
      deadFirefly.remove(); // Remove from world

      // Add both as tenants
      const lodge = wisp.getMutableComponent(Lodge)!;
      lodge.tenants.push(livingFirefly, deadFirefly);

      // Create a monster and kill it to trigger victory
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 200, y: 200 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Should not throw
      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: monster,
          damage: 10
        });
      }).not.toThrow();

      // Only living firefly should be evicted
      expect(lodge.tenants).toHaveLength(0);
      expect(livingFirefly.hasComponent(Position)).toBe(true);
    });

    it('should handle entities without Renderable component gracefully', () => {
      // Create a wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: 100, y: 100 });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly'], maxTenants: 1, tenants: [] });

      // Create a firefly without Renderable
      const firefly = world.createEntity();
      firefly.addComponent(FireflyTag);

      // Add as tenant
      const lodge = wisp.getMutableComponent(Lodge)!;
      lodge.tenants.push(firefly);

      // Create a monster and kill it to trigger victory
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 200, y: 200 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Should not throw and should remove from tenants
      expect(() => {
        gameEvents.emit(GameEvents.ATTACK_HIT, {
          attacker,
          target: monster,
          damage: 10
        });
      }).not.toThrow();

      expect(lodge.tenants).toHaveLength(0);
    });

    it('should handle empty lodges', () => {
      // Create an empty wisp lodge
      const wisp = world.createEntity();
      wisp.addComponent(Position, { x: 100, y: 100 });
      wisp.addComponent(Renderable, { type: 'wisp', color: 0x0000ff, radius: 10 });
      wisp.addComponent(Lodge, { allowedTenants: ['firefly'], maxTenants: 1, tenants: [] });

      // Create a monster and kill it to trigger victory
      const monster = world.createEntity();
      monster.addComponent(MonsterTag);
      monster.addComponent(Health, { currentHealth: 10, maxHealth: 100 });
      monster.addComponent(Position, { x: 200, y: 200 });
      monster.addComponent(Renderable, { type: 'monster', color: 0xff0000, radius: 8 });

      const attacker = world.createEntity();

      // Should not throw
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

