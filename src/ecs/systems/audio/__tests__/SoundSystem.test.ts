import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { World } from 'miniplex';
import type { Entity } from '@/ecs/Entity';
import { gameEvents, GameEvents } from '@/events';
import { SoundSystem } from '../SoundSystem';
import type { SoundEngine } from '../SoundEngine';

function createMockSoundEngine(): SoundEngine {
  return {
    initialize: vi.fn(),
    destroy: vi.fn(),
    update: vi.fn(),
    playChime: vi.fn(),
    playWoodTap: vi.fn(),
    playBassPulse: vi.fn(),
    playWispPulse: vi.fn(),
    playSpawn: vi.fn(),
    playDeath: vi.fn(),
    playWispActivation: vi.fn(),
    playConstruction: vi.fn(),
    playBreak: vi.fn(),
    playMotif: vi.fn(),
    playDefeatMotif: vi.fn(),
    startDrone: vi.fn(),
    stopDrone: vi.fn(),
    setDroneIntensity: vi.fn(),
    setTensionLevel: vi.fn(),
  } as unknown as SoundEngine;
}

describe('SoundSystem', () => {
  let world: World<Entity>;
  let engine: SoundEngine;
  let system: SoundSystem;

  beforeEach(() => {
    gameEvents.clear();
    world = new World<Entity>();
    engine = createMockSoundEngine();
    system = new SoundSystem(world, { soundEngine: engine });
  });

  describe('combat events', () => {
    it('plays wood tap on firefly dash attack burst', () => {
      const entity: Entity = { fireflyTag: true, position: { x: 0, y: 0 } };
      gameEvents.emit(GameEvents.COMBAT_ATTACK_BURST, {
        entity,
        attackPattern: { handlerType: 'dash', chargeTime: 0, attackDuration: 0, recoveryTime: 0, damage: 0 },
        position: { x: 100, y: 100 },
      });

      expect(engine.playWoodTap).toHaveBeenCalled();
      expect(engine.playBassPulse).not.toHaveBeenCalled();
    });

    it('plays bass pulse on monster AoE attack burst', () => {
      const entity: Entity = { monsterTag: true, position: { x: 0, y: 0 } };
      gameEvents.emit(GameEvents.COMBAT_ATTACK_BURST, {
        entity,
        attackPattern: { handlerType: 'pulse', chargeTime: 0, attackDuration: 0, recoveryTime: 0, damage: 0 },
        position: { x: 100, y: 100 },
      });

      expect(engine.playBassPulse).toHaveBeenCalled();
      expect(engine.playWoodTap).not.toHaveBeenCalled();
    });

    it('plays wisp pulse on wisp attack burst', () => {
      const entity: Entity = { wispTag: true, position: { x: 0, y: 0 } };
      gameEvents.emit(GameEvents.COMBAT_ATTACK_BURST, {
        entity,
        attackPattern: { handlerType: 'pulse', chargeTime: 0, attackDuration: 0, recoveryTime: 0, damage: 0 },
        position: { x: 100, y: 100 },
      });

      expect(engine.playWispPulse).toHaveBeenCalled();
      expect(engine.playBassPulse).not.toHaveBeenCalled();
    });
  });

  describe('placement events', () => {
    it('plays chime on wisp placement', () => {
      gameEvents.emit(GameEvents.PLACEMENT_COMPLETED, {
        itemType: 'wisp', x: 100, y: 100,
      });

      expect(engine.playChime).toHaveBeenCalled();
    });

    it('plays construction on wall placement', () => {
      gameEvents.emit(GameEvents.PLACEMENT_COMPLETED, {
        itemType: 'wall', x: 100, y: 100,
      });

      expect(engine.playConstruction).toHaveBeenCalled();
    });
  });

  describe('entity lifecycle events', () => {
    it('plays spawn sound with correct type for firefly', () => {
      gameEvents.emit(GameEvents.ENTITY_SPAWNED, {
        entity: { fireflyTag: true } as Entity,
        type: 'firefly',
      });

      expect(engine.playSpawn).toHaveBeenCalledWith(
        expect.any(Number), 'firefly', expect.any(Number)
      );
    });

    it('plays spawn sound with correct type for monster', () => {
      gameEvents.emit(GameEvents.ENTITY_SPAWNED, {
        entity: { monsterTag: true } as Entity,
        type: 'monster',
      });

      expect(engine.playSpawn).toHaveBeenCalledWith(
        expect.any(Number), 'monster', expect.any(Number)
      );
    });

    it('plays firefly death sound', () => {
      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { fireflyTag: true } as Entity,
        position: { x: 0, y: 0 },
      });

      expect(engine.playDeath).toHaveBeenCalledWith('firefly');
    });

    it('plays monster death sound', () => {
      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { monsterTag: true } as Entity,
        position: { x: 0, y: 0 },
      });

      expect(engine.playDeath).toHaveBeenCalledWith('monster');
    });

    it('plays wisp death sound', () => {
      gameEvents.emit(GameEvents.ENTITY_DIED, {
        entity: { wispTag: true } as Entity,
        position: { x: 0, y: 0 },
      });

      expect(engine.playDeath).toHaveBeenCalledWith('wisp');
    });
  });

  describe('goal and wall events', () => {
    it('plays collect motif when firefly reaches goal', () => {
      gameEvents.emit(GameEvents.ENTITY_REACHED_GOAL, {
        entity: { fireflyTag: true } as Entity,
        position: { x: 0, y: 0 },
      });

      expect(engine.playMotif).toHaveBeenCalled();
    });

    it('does not play collect motif for non-firefly reaching goal', () => {
      gameEvents.emit(GameEvents.ENTITY_REACHED_GOAL, {
        entity: { monsterTag: true } as Entity,
        position: { x: 0, y: 0 },
      });

      expect(engine.playMotif).not.toHaveBeenCalled();
    });

    it('plays wisp activation when firefly lodges in wisp', () => {
      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: { wispTag: true } as Entity,
        tenantEntity: { fireflyTag: true } as Entity,
      });

      expect(engine.playWispActivation).toHaveBeenCalled();
    });

    it('does not play wisp activation for non-wisp lodge', () => {
      gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, {
        lodgeEntity: {} as Entity,
        tenantEntity: { fireflyTag: true } as Entity,
      });

      expect(engine.playWispActivation).not.toHaveBeenCalled();
    });

    it('plays construction on wall activated', () => {
      gameEvents.emit(GameEvents.WALL_ACTIVATED, {
        entity: {} as Entity,
      });

      expect(engine.playConstruction).toHaveBeenCalledWith(true);
    });

    it('plays break on wall destroyed', () => {
      gameEvents.emit(GameEvents.WALL_DESTROYED, {
        entity: {} as Entity,
        position: { x: 0, y: 0 },
      });

      expect(engine.playBreak).toHaveBeenCalled();
    });
  });

  describe('level flow events', () => {
    it('starts drone on game started', () => {
      gameEvents.emit(GameEvents.GAME_STARTED, {});
      expect(engine.startDrone).toHaveBeenCalled();
    });

    it('plays victory motif on level won', () => {
      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 5 });
      expect(engine.playMotif).toHaveBeenCalled();
      expect(engine.stopDrone).toHaveBeenCalled();
    });

    it('plays defeat motif on level lost', () => {
      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });
      expect(engine.playDefeatMotif).toHaveBeenCalled();
      expect(engine.stopDrone).toHaveBeenCalled();
    });
  });

  describe('drone intensity from game state', () => {
    it('does not update drone when game is not active', () => {
      world.add({ monsterTag: true, position: { x: 0, y: 0 } });
      system.update(16, 0);
      expect(engine.setDroneIntensity).not.toHaveBeenCalled();
    });

    it('sets drone intensity based on entity counts', () => {
      gameEvents.emit(GameEvents.GAME_STARTED, {});
      world.add({ monsterTag: true, position: { x: 0, y: 0 } });
      world.add({ monsterTag: true, position: { x: 0, y: 0 } });
      world.add({ fireflyTag: true, position: { x: 0, y: 0 } });

      system.update(16, 0);

      expect(engine.setDroneIntensity).toHaveBeenCalled();
      const intensity = (engine.setDroneIntensity as Mock).mock.calls[0][0];
      expect(intensity).toBeGreaterThan(0);
    });

    it('sets tension level based on monster count', () => {
      gameEvents.emit(GameEvents.GAME_STARTED, {});
      world.add({ monsterTag: true, position: { x: 0, y: 0 } });

      system.update(16, 0);

      expect(engine.setTensionLevel).toHaveBeenCalled();
      const tension = (engine.setTensionLevel as Mock).mock.calls[0][0];
      expect(tension).toBeGreaterThan(0);
    });

    it('sets zero tension when no monsters', () => {
      gameEvents.emit(GameEvents.GAME_STARTED, {});
      world.add({ fireflyTag: true, position: { x: 0, y: 0 } });

      system.update(16, 0);

      expect(engine.setTensionLevel).toHaveBeenCalledWith(0);
    });

    it('stops updating after level won', () => {
      gameEvents.emit(GameEvents.GAME_STARTED, {});
      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 5 });
      vi.mocked(engine.setDroneIntensity).mockClear();

      world.add({ monsterTag: true, position: { x: 0, y: 0 } });
      system.update(16, 0);

      expect(engine.setDroneIntensity).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('unsubscribes all events on destroy', () => {
      system.destroy();

      gameEvents.emit(GameEvents.COMBAT_ATTACK_BURST, {
        entity: { fireflyTag: true } as Entity,
        attackPattern: { handlerType: 'dash', chargeTime: 0, attackDuration: 0, recoveryTime: 0, damage: 0 },
        position: { x: 0, y: 0 },
      });

      expect(engine.playWoodTap).not.toHaveBeenCalled();
    });

    it('destroys sound engine on destroy', () => {
      system.destroy();
      expect(engine.destroy).toHaveBeenCalled();
    });
  });
});
