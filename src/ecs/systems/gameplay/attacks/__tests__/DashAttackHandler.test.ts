import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'ecsy';
import { DashAttackHandler } from '../DashAttackHandler';
import { AttackContext } from '../AttackHandler';
import { Combat, CombatState, Position, Velocity, PhysicsBody, Renderable, FireflyTag } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { ECSEntity } from '@/types';
import { createMockScene, createMockContainer, createMockSprite, createMockGraphics } from '@/__tests__/helpers';
import { createMockContainer } from '@/__tests__/helpers/phaser-mocks';

describe('DashAttackHandler', () => {
  let handler: DashAttackHandler;
  let world: World;
  let attacker: ECSEntity;
  let target: ECSEntity;
  let mockCombat: Combat;
  let mockScene: any;
  let mockContainer: any;

  beforeEach(() => {
    handler = new DashAttackHandler();
    world = new World();
    world
      .registerComponent(Position)
      .registerComponent(Velocity)
      .registerComponent(PhysicsBody)
      .registerComponent(Renderable)
      .registerComponent(Combat)
      .registerComponent(FireflyTag);

    attacker = world.createEntity();
    attacker.addComponent(Position, { x: 0, y: 0 });
    attacker.addComponent(Velocity, { vx: 0, vy: 0 });
    attacker.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });
    attacker.addComponent(Renderable, { type: 'firefly', color: 0xffffff, radius: 5, scale: 1.0, tint: 0xFFFFFF });

    target = world.createEntity();
    target.addComponent(Position, { x: 100, y: 0 });
    target.addComponent(PhysicsBody, { mass: 1, isStatic: false, collisionRadius: 5 });

    mockCombat = {
      state: CombatState.ATTACKING,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      hasHit: false,
      attackPattern: {
        handlerType: 'dash',
        chargeTime: 1800,
        attackDuration: 500,
        recoveryTime: 600,
        damage: 10,
        knockbackForce: 50,
        dashSpeed: 100
      }
    };

    mockContainer = createMockContainer();
    mockScene = createMockScene();
    mockScene.add.graphics.mockReturnValue(createMockGraphics());

    vi.clearAllMocks();
  });

  describe('Dash Attack Logic', () => {
    it('should apply dash velocity on attack start', () => {
      const velocity = attacker.getMutableComponent(Velocity)!;
      const position = attacker.getComponent(Position)!;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position,
        velocity
      };

      handler.onAttackStart?.(context);

      // Should set velocity toward target
      expect(velocity.vx).toBeGreaterThan(0); // Moving toward target at x=100
      expect(velocity.vy).toBe(0);
    });

    it('should hit target when entities collide', () => {
      // Move attacker close to target
      const attackerPos = attacker.getMutableComponent(Position)!;
      attackerPos.x = 95; // Within collision range

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attackerPos,
        velocity: attacker.getComponent(Velocity)!
      };

      handler.execute(context);

      expect(gameEvents.emit).toHaveBeenCalledWith(GameEvents.ATTACK_HIT, {
        attacker,
        target,
        damage: 10,
        knockbackForce: 50
      });
      expect(mockCombat.hasHit).toBe(true);
    });

    it('should only hit once per attack', () => {
      const attackerPos = attacker.getMutableComponent(Position)!;
      attackerPos.x = 95;

      vi.spyOn(gameEvents, 'emit');

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attackerPos,
        velocity: attacker.getComponent(Velocity)!
      };

      handler.execute(context);
      handler.execute(context); // Call again

      // Should only hit once
      expect(gameEvents.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual Effects - Charging', () => {
    it('should scale up entity during charging', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      
      // Start of charge (0% progress)
      mockCombat.state = CombatState.CHARGING;
      mockCombat.chargeTime = 0;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable,
        dt: 16,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      expect(renderable.scale).toBe(1.0);

      // Halfway through charge
      mockCombat.chargeTime = 900; // 50% of 1800ms
      handler.onCharging?.(context);

      expect(renderable.scale).toBeGreaterThan(1.0);
      expect(renderable.scale).toBeLessThanOrEqual(1.15);

      // End of charge
      mockCombat.chargeTime = 1800; // 100%
      handler.onCharging?.(context);

      expect(renderable.scale).toBe(1.15);
    });

    it('should apply sine wave brightness pulse during charging', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      mockCombat.state = CombatState.CHARGING;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable,
        dt: 16,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      const initialTint = renderable.tint;

      // Progress through charge
      mockCombat.chargeTime = 900; // Middle of charge
      handler.onCharging?.(context);

      // Tint should change (brightness pulse)
      expect(renderable.tint).not.toBe(initialTint);
    });
  });

  describe('Visual Effects - Attacking', () => {
    it('should create trail graphics during dash', () => {
      mockCombat.state = CombatState.ATTACKING;
      mockCombat.attackElapsed = 0;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable: attacker.getComponent(Renderable)!,
        dt: 60,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      // Execute to trigger trail creation
      handler.execute(context);

      // Should have created graphics for trail
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should maintain scale at 1.15 during attack', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.scale = 1.15; // Set by charging phase
      
      mockCombat.state = CombatState.ATTACKING;
      mockCombat.attackElapsed = 100;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable,
        dt: 16,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      handler.execute(context);

      // Scale should remain at 1.15 during attack
      expect(renderable.scale).toBe(1.15);
    });
  });

  describe('Visual Effects - Recovering', () => {
    it('should scale down during recovery', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.scale = 1.15; // From attack phase

      mockCombat.state = CombatState.RECOVERING;
      mockCombat.recoveryElapsed = 0;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable,
        dt: 16,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      // Halfway through recovery
      mockCombat.recoveryElapsed = 300; // 50% of 600ms
      handler.onRecovering?.(context);

      expect(renderable.scale).toBeLessThan(1.15);
      expect(renderable.scale).toBeGreaterThanOrEqual(0.95);

      // End of recovery
      mockCombat.recoveryElapsed = 600; // 100%
      handler.onRecovering?.(context);

      expect(renderable.scale).toBeCloseTo(1.0, 2);
    });

    it('should return tint to normal during recovery', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.tint = 0xFFAAAA; // Some modified tint from attack

      mockCombat.state = CombatState.RECOVERING;
      mockCombat.recoveryElapsed = 300;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable,
        dt: 16,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      handler.onRecovering?.(context);

      // Tint should be moving back toward white
      expect(renderable.tint).toBeGreaterThan(0xFFAAAA);
    });
  });

  describe('Visual Effects - Cleanup', () => {
    it('should destroy trail graphics on cleanup', () => {
      const mockGraphics = createMockGraphics();
      mockScene.add.graphics.mockReturnValue(mockGraphics);

      // Create some trails first
      mockCombat.state = CombatState.ATTACKING;
      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable: attacker.getComponent(Renderable)!,
        dt: 60,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      handler.execute(context);

      // Verify trail was created
      expect(mockScene.add.graphics).toHaveBeenCalled();

      // Now cleanup
      handler.cleanup?.(context);

      // Graphics should be destroyed
      expect(mockGraphics.destroy).toHaveBeenCalled();
    });

    it('should reset scale and tint on cleanup', () => {
      const renderable = attacker.getMutableComponent(Renderable)!;
      renderable.scale = 1.15;
      renderable.tint = 0xFFAAAA;

      const context: AttackContext = {
        attacker,
        target,
        combat: mockCombat,
        world,
        position: attacker.getComponent(Position)!,
        velocity: attacker.getComponent(Velocity)!,
        renderable,
        dt: 16,
        scene: mockScene,
        spriteContainer: mockContainer
      };

      handler.cleanup?.(context);

      expect(renderable.scale).toBe(1.0);
      expect(renderable.tint).toBe(0xFFFFFF);
    });
  });

  describe('Container-based Graphics', () => {
    let mockScene: any;
    let mockContainer: any;

    beforeEach(() => {
      mockScene = createMockScene();
      mockContainer = createMockContainer();
      world.registerComponent(Renderable);
    });

    it('should store trail graphics in sprite container, not handler instance', () => {
      const attacker1 = world.createEntity();
      attacker1.addComponent(Position, { x: 100, y: 100 });
      attacker1.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker1.addComponent(FireflyTag);
      attacker1.addComponent(Renderable, {
        type: 'firefly',
        radius: 5,
        color: 0xffff00,
        scale: 1.0,
        tint: 0xFFFFFF
      });

      const attacker2 = world.createEntity();
      attacker2.addComponent(Position, { x: 200, y: 200 });
      attacker2.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker2.addComponent(FireflyTag);
      attacker2.addComponent(Renderable, {
        type: 'firefly',
        radius: 5,
        color: 0xffff00,
        scale: 1.0,
        tint: 0xFFFFFF
      });

      const mockContainer2 = createMockContainer();

      const mockGraphics1 = createMockGraphics();
      const mockGraphics2 = createMockGraphics();
      mockScene.add.graphics
        .mockReturnValueOnce(mockGraphics1)
        .mockReturnValueOnce(mockGraphics2);

      const combat = {
        state: CombatState.ATTACKING,
        chargeTime: 1800,
        attackElapsed: 50, // Trigger trail spawn
        recoveryElapsed: 0,
        attackPattern: {
          handlerType: 'dash',
          chargeTime: 1800,
          attackDuration: 500,
          recoveryTime: 600,
          damage: 10,
          knockbackForce: 50,
          dashSpeed: 100
        },
        hasHit: false
      };

      // Both attackers create trails simultaneously
      handler.execute({
        attacker: attacker1,
        combat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        position: attacker1.getComponent(Position)!,
        renderable: attacker1.getMutableComponent(Renderable)!,
        dt: 50
      });

      handler.execute({
        attacker: attacker2,
        combat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer2,
        position: attacker2.getComponent(Position)!,
        renderable: attacker2.getMutableComponent(Renderable)!,
        dt: 50
      });

      // Each container should have its own trail graphics
      const trails1 = mockContainer.list.filter((c: any) => c.name?.startsWith('dashTrail-'));
      const trails2 = mockContainer2.list.filter((c: any) => c.name?.startsWith('dashTrail-'));

      expect(trails1.length).toBeGreaterThan(0);
      expect(trails2.length).toBeGreaterThan(0);
      
      // Trails should be in separate containers
      expect(mockContainer.list).not.toEqual(mockContainer2.list);
    });

    it('should cleanup trails from container on handler cleanup', () => {
      const attacker = world.createEntity();
      attacker.addComponent(Position, { x: 100, y: 100 });
      attacker.addComponent(Velocity, { vx: 0, vy: 0 });
      attacker.addComponent(FireflyTag);
      attacker.addComponent(Renderable, {
        type: 'firefly',
        radius: 5,
        color: 0xffff00,
        scale: 1.0,
        tint: 0xFFFFFF
      });

      const mockGraphics = createMockGraphics();
      mockScene.add.graphics.mockReturnValue(mockGraphics);

      const combat = {
        state: CombatState.ATTACKING,
        chargeTime: 1800,
        attackElapsed: 50,
        recoveryElapsed: 0,
        attackPattern: {
          handlerType: 'dash',
          chargeTime: 1800,
          attackDuration: 500,
          recoveryTime: 600,
          damage: 10,
          knockbackForce: 50,
          dashSpeed: 100
        },
        hasHit: false
      };

      // Create trails
      handler.execute({
        attacker,
        combat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        position: attacker.getComponent(Position)!,
        renderable: attacker.getMutableComponent(Renderable)!,
        dt: 50
      });

      const trailsBefore = mockContainer.list.filter((c: any) => c.name?.startsWith('dashTrail-'));
      expect(trailsBefore.length).toBeGreaterThan(0);

      // Cleanup
      handler.cleanup({
        attacker,
        combat,
        world,
        scene: mockScene,
        spriteContainer: mockContainer,
        renderable: attacker.getMutableComponent(Renderable)!
      });

      // All trail graphics should be destroyed
      trailsBefore.forEach((trail: any) => {
        expect(trail.destroy).toHaveBeenCalled();
      });
    });
  });
});
