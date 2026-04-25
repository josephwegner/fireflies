import type { GameWorld } from '@/ecs/Entity';
import { GameSystemBase } from '@/ecs/GameSystem';
import { gameEvents, GameEvents, type GameEventPayloads } from '@/events';
import { SoundEngine } from './SoundEngine';
import { randomNote, noteWithDetune, motifNotes } from './scales';

interface SoundDebug {
  mute: Record<string, boolean>;
  toggle(category: string): void;
  status(): void;
}

export class SoundSystem extends GameSystemBase {
  private engine: SoundEngine;
  private world: GameWorld;
  private gameActive = false;
  private muted: Record<string, boolean> = {};

  private monsters;
  private fireflies;
  private wisps;
  private combatants;

  constructor(world: GameWorld, config: { soundEngine?: SoundEngine; [key: string]: any }) {
    super();
    this.world = world;

    if (config.soundEngine) {
      this.engine = config.soundEngine;
    } else {
      const audioContext = new AudioContext();
      this.engine = new SoundEngine(audioContext);
      this.engine.initialize();
    }

    this.monsters = world.with('monsterTag', 'position');
    this.fireflies = world.with('fireflyTag', 'position');
    this.wisps = world.with('wispTag', 'position');
    this.combatants = world.with('combat');

    this.listen(GameEvents.COMBAT_ATTACK_BURST, this.onAttackBurst);
    this.listen(GameEvents.PLACEMENT_COMPLETED, this.onPlacement);
    this.listen(GameEvents.ENTITY_SPAWNED, this.onEntitySpawned);
    this.listen(GameEvents.ENTITY_DIED, this.onEntityDied);
    this.listen(GameEvents.ENTITY_REACHED_GOAL, this.onEntityReachedGoal);
    this.listen(GameEvents.TENANT_ADDED_TO_LODGE, this.onTenantAdded);
    this.listen(GameEvents.WALL_ACTIVATED, this.onWallActivated);
    this.listen(GameEvents.WALL_DESTROYED, this.onWallDestroyed);
    this.listen(GameEvents.LEVEL_WON, this.onLevelWon);
    this.listen(GameEvents.LEVEL_LOST, this.onLevelLost);
    this.listen(GameEvents.GAME_STARTED, this.onGameStarted);

    this.setupDebug();
  }

  private setupDebug(): void {
    const categories = ['attack', 'spawn', 'death', 'placement', 'activation', 'wall', 'motif', 'drone', 'tension', 'ambient'];
    for (const cat of categories) this.muted[cat] = false;

    (window as any).sound = {
      mute: this.muted,
      toggle: (category: string) => {
        this.muted[category] = !this.muted[category];
        console.log(`[Sound] ${category}: ${this.muted[category] ? 'MUTED' : 'ON'}`);
      },
      status: () => {
        for (const [cat, muted] of Object.entries(this.muted)) {
          console.log(`  ${cat}: ${muted ? 'MUTED' : 'ON'}`);
        }
      },
      muteAll: () => {
        for (const cat of categories) this.muted[cat] = true;
        console.log('[Sound] All muted');
      },
      unmuteAll: () => {
        for (const cat of categories) this.muted[cat] = false;
        console.log('[Sound] All unmuted');
      },
      test: (sound: string) => {
        const freq = 196.0;
        const tests: Record<string, () => void> = {
          chime: () => this.engine.playChime(freq),
          woodTap: () => this.engine.playWoodTap(freq),
          bassPulse: () => this.engine.playBassPulse(65.41),
          wispPulse: () => this.engine.playWispPulse(freq),
          monsterSpawn: () => this.engine.playSpawn(130.81, 'monster', 0.1),
          fireflySpawn: () => this.engine.playSpawn(261.63, 'firefly', 0.06),
          activation: () => this.engine.playWispActivation(),
          construction: () => this.engine.playConstruction(),
          break: () => this.engine.playBreak(),
        };
        if (tests[sound]) {
          console.log(`[Sound] Testing: ${sound}`);
          tests[sound]();
        } else {
          console.log(`[Sound] Available: ${Object.keys(tests).join(', ')}`);
        }
      },
      voices: () => { const n = (this.engine as any).activeVoices.size; console.log(`[Sound] Active voices: ${n}`); return n; },
    } satisfies SoundDebug & { muteAll(): void; unmuteAll(): void; test(s: string): void; voices(): void };

    console.log('[Sound] Debug: sound.test() for list, sound.voices() for pool count');
  }

  destroy(): void {
    super.destroy();
    this.engine.destroy();
  }

  update(_delta: number, _time: number): void {
    if (!this.gameActive) return;

    const monsterCount = this.monsters.entities.length;
    const fireflyCount = this.fireflies.entities.length;
    const wispCount = this.wisps.entities.length;
    const totalEntities = monsterCount + fireflyCount + wispCount;

    const combatActive = this.combatants.entities.filter(
      e => e.combat!.state !== 'IDLE'
    ).length;

    const entityDensity = Math.min(totalEntities / 20, 1.0);
    const combatActivity = Math.min(combatActive / 8, 1.0);
    const intensity = entityDensity * 0.4 + combatActivity * 0.6;

    if (!this.muted.drone) {
      this.engine.setDroneIntensity(intensity);
    }

    const tensionLevel = monsterCount > 0 ? Math.min(monsterCount / 6, 1.0) : 0;
    if (!this.muted.tension) {
      this.engine.setTensionLevel(tensionLevel);
    }

    const friendlyCount = fireflyCount + wispCount;
    const fireflyRatio = totalEntities > 0 ? friendlyCount / totalEntities : 0.5;
    if (!this.muted.ambient) {
      this.engine.setAmbientMood(fireflyRatio);
    }

    this.engine.update(_delta);
  }

  // ─── Event handlers ──────────────────────────────────────────────────────

  private onAttackBurst(data: GameEventPayloads[typeof GameEvents.COMBAT_ATTACK_BURST]): void {
    if (this.muted.attack) return;
    const { entity, attackPattern } = data;

    if (entity.fireflyTag && attackPattern.handlerType === 'dash') {
      this.engine.playWoodTap(noteWithDetune(196.0));
    } else if (entity.monsterTag && attackPattern.handlerType === 'pulse') {
      this.engine.playBassPulse(noteWithDetune(65.41));
    } else if (entity.wispTag && attackPattern.handlerType === 'pulse') {
      this.engine.playWispPulse(randomNote(1));
    }
  }

  private onPlacement(data: GameEventPayloads[typeof GameEvents.PLACEMENT_COMPLETED]): void {
    if (this.muted.placement) return;
    if (data.itemType === 'wisp') {
      this.engine.playChime(randomNote(1));
    } else if (data.itemType === 'wall') {
      this.engine.playConstruction();
    }
  }

  private onEntitySpawned(data: GameEventPayloads[typeof GameEvents.ENTITY_SPAWNED]): void {
    if (this.muted.spawn) return;
    const { entity, type } = data;
    if (type === 'firefly') {
      this.engine.playSpawn(randomNote(1), 'firefly', 0.06);
    } else if (type === 'monster') {
      this.engine.playSpawn(randomNote(0), 'monster', 0.1);
    }
  }

  private onEntityDied(data: GameEventPayloads[typeof GameEvents.ENTITY_DIED]): void {
    if (this.muted.death) return;
    const { entity } = data;
    if (entity.fireflyTag) {
      this.engine.playDeath('firefly');
    } else if (entity.monsterTag) {
      this.engine.playDeath('monster');
    } else if (entity.wispTag) {
      this.engine.playDeath('wisp');
    }
  }

  private onEntityReachedGoal(data: GameEventPayloads[typeof GameEvents.ENTITY_REACHED_GOAL]): void {
    if (this.muted.motif) return;
    if (data.entity.fireflyTag) {
      this.engine.playMotif(motifNotes('collect'), 0.12, 0.1, 0.5);
    }
  }

  private onTenantAdded(data: GameEventPayloads[typeof GameEvents.TENANT_ADDED_TO_LODGE]): void {
    if (this.muted.activation) return;
    if (data.lodgeEntity.wispTag) {
      this.engine.playWispActivation();
    }
  }

  private onWallActivated(_data: GameEventPayloads[typeof GameEvents.WALL_ACTIVATED]): void {
    if (this.muted.wall) return;
    this.engine.playConstruction(true);
  }

  private onWallDestroyed(_data: GameEventPayloads[typeof GameEvents.WALL_DESTROYED]): void {
    if (this.muted.wall) return;
    this.engine.playBreak();
  }

  private onLevelWon(_data: GameEventPayloads[typeof GameEvents.LEVEL_WON]): void {
    this.gameActive = false;
    this.engine.playMotif(motifNotes('victory'), 0.2, 0.15, 0.8);
    this.engine.stopDrone(3);
    this.engine.stopAmbient();
  }

  private onLevelLost(_data: GameEventPayloads[typeof GameEvents.LEVEL_LOST]): void {
    this.gameActive = false;
    this.engine.playDefeatMotif(motifNotes('defeat'));
    this.engine.stopDrone(3);
    this.engine.stopAmbient();
  }

  private onGameStarted(_data: GameEventPayloads[typeof GameEvents.GAME_STARTED]): void {
    this.gameActive = true;
    if (!this.muted.drone) {
      this.engine.startDrone(3);
    }
    if (!this.muted.ambient) {
      this.engine.startAmbient();
    }
  }
}
