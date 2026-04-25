import { VoicePool, type AudioGraph } from './VoicePool';
import { ChimeGenerator } from './instruments/ChimeGenerator';
import { WoodTapGenerator } from './instruments/WoodTapGenerator';
import { BassPulseGenerator } from './instruments/BassPulseGenerator';
import { SfxGenerator } from './instruments/SfxGenerator';
import { DroneSystem } from './DroneSystem';
import { MotifComposer } from './MotifComposer';
import { AmbientGenerator } from './AmbientGenerator';

const MASTER_VOLUME = 0.8;

const REVERB = {
  SEND_LEVEL: 0.4,
  RETURN_LEVEL: 0.5,
  DELAY_TIMES: [0.031, 0.073, 0.113, 0.171],
  TAP_GAINS: [0.4, 0.3, 0.2, 0.15],
  FILTER_FREQS: [3000, 2500, 2000, 1500],
};

export class SoundEngine {
  private ctx: AudioContext;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private droneGain!: GainNode;
  private reverbSend!: GainNode;
  private reverbReturn!: GainNode;

  private voicePool!: VoicePool;
  private chime!: ChimeGenerator;
  private woodTap!: WoodTapGenerator;
  private bassPulse!: BassPulseGenerator;
  private sfx!: SfxGenerator;
  private drone!: DroneSystem;
  private motif!: MotifComposer;
  private ambient!: AmbientGenerator;

  private initialized = false;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
  }

  initialize(): void {
    if (this.initialized) return;

    if (this.ctx.state === 'suspended') {
      const resume = () => {
        this.ctx.resume().catch(() => {});
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('pointerdown', resume);
      document.addEventListener('keydown', resume);
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = MASTER_VOLUME;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.masterGain);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.connect(this.masterGain);

    this.buildReverbNetwork();

    this.voicePool = new VoicePool(this.ctx);
    const graph: AudioGraph = {
      ctx: this.ctx,
      sfxGain: this.sfxGain,
      reverbSend: this.reverbSend,
      voicePool: this.voicePool,
    };

    this.chime = new ChimeGenerator(graph);
    this.woodTap = new WoodTapGenerator(graph);
    this.bassPulse = new BassPulseGenerator(graph);
    this.sfx = new SfxGenerator(graph);
    this.drone = new DroneSystem(this.ctx, this.droneGain, this.masterGain);
    this.motif = new MotifComposer(graph);
    this.ambient = new AmbientGenerator(graph);

    this.initialized = true;
  }

  private buildReverbNetwork(): void {
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = REVERB.SEND_LEVEL;

    this.reverbReturn = this.ctx.createGain();
    this.reverbReturn.gain.value = REVERB.RETURN_LEVEL;
    this.reverbReturn.connect(this.masterGain);

    for (let i = 0; i < REVERB.DELAY_TIMES.length; i++) {
      const delay = this.ctx.createDelay(0.5);
      delay.delayTime.value = REVERB.DELAY_TIMES[i];

      const tapGain = this.ctx.createGain();
      tapGain.gain.value = REVERB.TAP_GAINS[i];

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = REVERB.FILTER_FREQS[i];

      this.reverbSend.connect(delay);
      delay.connect(filter);
      filter.connect(tapGain);
      tapGain.connect(this.reverbReturn);
    }
  }

  destroy(): void {
    this.drone?.destroy();
    this.ambient?.stop();
    this.voicePool?.killAll();

    try { this.reverbSend?.disconnect(); } catch { /* ok */ }
    try { this.reverbReturn?.disconnect(); } catch { /* ok */ }
    try { this.sfxGain?.disconnect(); } catch { /* ok */ }
    try { this.droneGain?.disconnect(); } catch { /* ok */ }
    try { this.masterGain?.disconnect(); } catch { /* ok */ }

    this.initialized = false;
    this.ctx.close().catch(() => {});
  }

  playChime(frequency: number, reverbAmount?: number, velocity?: number): void {
    if (!this.initialized) return;
    this.chime.playChime(frequency, reverbAmount, velocity);
  }

  playWispActivation(): void {
    if (!this.initialized) return;
    this.chime.playWispActivation();
  }

  playWoodTap(frequency: number, velocity?: number): void {
    if (!this.initialized) return;
    this.woodTap.playWoodTap(frequency, velocity);
  }

  playBassPulse(frequency: number, velocity?: number): void {
    if (!this.initialized) return;
    this.bassPulse.playBassPulse(frequency, velocity);
  }

  playWispPulse(frequency: number, velocity?: number): void {
    if (!this.initialized) return;
    this.bassPulse.playWispPulse(frequency, velocity);
  }

  playSpawn(frequency: number, type: 'firefly' | 'monster', velocity?: number): void {
    if (!this.initialized) return;
    this.sfx.playSpawn(frequency, type, velocity);
  }

  playDeath(type: 'firefly' | 'monster' | 'wisp'): void {
    if (!this.initialized) return;
    this.sfx.playDeath(type);
  }

  playConstruction(bright?: boolean, velocity?: number): void {
    if (!this.initialized) return;
    this.sfx.playConstruction(bright, velocity);
  }

  playBreak(): void {
    if (!this.initialized) return;
    this.sfx.playBreak();
  }

  playMotif(notes: number[], spacing?: number, velocity?: number, reverbAmount?: number): void {
    if (!this.initialized) return;
    this.motif.playMotif(notes, spacing, velocity, reverbAmount);
  }

  playDefeatMotif(notes: number[]): void {
    if (!this.initialized) return;
    this.motif.playDefeatMotif(notes);
  }

  startDrone(fadeTime?: number): void {
    if (!this.initialized) return;
    this.drone.startDrone(fadeTime);
  }

  stopDrone(fadeTime?: number): void {
    if (!this.initialized) return;
    this.drone.stopDrone(fadeTime);
  }

  setDroneIntensity(intensity: number): void {
    if (!this.initialized) return;
    this.drone.setDroneIntensity(intensity);
  }

  setTensionLevel(level: number): void {
    if (!this.initialized) return;
    this.drone.setTensionLevel(level);
  }

  startAmbient(): void {
    if (!this.initialized) return;
    this.ambient.start();
  }

  stopAmbient(): void {
    if (!this.initialized) return;
    this.ambient.stop();
  }

  setAmbientMood(fireflyRatio: number): void {
    if (!this.initialized) return;
    this.ambient.setMood(fireflyRatio);
  }

  update(_delta: number): void {
    if (!this.initialized) return;
    this.ambient.update();
  }

  createNoiseBuffer(duration: number): AudioBuffer {
    return this.voicePool.createNoiseBuffer(duration);
  }
}
