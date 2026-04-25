import { LOOKAHEAD, GAIN_FLOOR } from './VoicePool';
import { DRONE_FREQUENCIES } from './scales';

const DRONE = {
  FADE_IN: 3,
  INITIAL_VOLUME: 0.3,
  OSC_GAIN: 0.5,
  LFO_RATE_1: 0.05,
  LFO_RATE_2: 0.037,
  LFO_DEPTH: 0.15,
  TRIANGLE_GAIN: 0.3,
  FILTER_CENTER: 200,
  FILTER_LFO_RATE: 0.02,
  FILTER_LFO_DEPTH: 150,
  INTENSITY_MIN_VOLUME: 0.1,
  INTENSITY_MAX_VOLUME: 0.3,
};

const TENSION = {
  BEAT_FREQ_OFFSET: 3,
  LOWPASS_FREQ: 150,
  MAX_GAIN: 0.8,
  FADE_TIME: 3,
};

export class DroneSystem {
  private ctx: AudioContext;
  private droneGain: GainNode;
  private masterGain: GainNode;

  private droneOscillators: OscillatorNode[] = [];
  private droneLFOs: OscillatorNode[] = [];
  private droneNodes: AudioNode[] = [];
  private tensionOscillators: OscillatorNode[] = [];
  private tensionGain: GainNode | null = null;
  private lastTensionTarget = -1;
  private droneActive = false;

  constructor(ctx: AudioContext, droneGain: GainNode, masterGain: GainNode) {
    this.ctx = ctx;
    this.droneGain = droneGain;
    this.masterGain = masterGain;
  }

  get isActive(): boolean {
    return this.droneActive;
  }

  startDrone(fadeTime = DRONE.FADE_IN): void {
    if (this.droneActive) return;
    this.droneActive = true;

    const now = this.ctx.currentTime + LOOKAHEAD;
    this.droneGain.gain.setTargetAtTime(DRONE.INITIAL_VOLUME, this.ctx.currentTime, fadeTime / 3);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = DRONE_FREQUENCIES.C2;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = DRONE_FREQUENCIES.G1;

    const gain1 = this.ctx.createGain();
    gain1.gain.value = DRONE.OSC_GAIN;
    const gain2 = this.ctx.createGain();
    gain2.gain.value = DRONE.OSC_GAIN;

    const lfo1 = this.ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = DRONE.LFO_RATE_1;
    const lfoGain1 = this.ctx.createGain();
    lfoGain1.gain.value = DRONE.LFO_DEPTH;

    const lfo2 = this.ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = DRONE.LFO_RATE_2;
    const lfoGain2 = this.ctx.createGain();
    lfoGain2.gain.value = DRONE.LFO_DEPTH;

    lfo1.connect(lfoGain1);
    lfoGain1.connect(gain1.gain);
    lfo2.connect(lfoGain2);
    lfoGain2.connect(gain2.gain);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.droneGain);
    gain2.connect(this.droneGain);

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.value = DRONE_FREQUENCIES.C2 * 2;

    const filter3 = this.ctx.createBiquadFilter();
    filter3.type = 'lowpass';
    filter3.frequency.value = DRONE.FILTER_CENTER;

    const filterLfo = this.ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = DRONE.FILTER_LFO_RATE;
    const filterLfoGain = this.ctx.createGain();
    filterLfoGain.gain.value = DRONE.FILTER_LFO_DEPTH;

    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter3.frequency);

    const gain3 = this.ctx.createGain();
    gain3.gain.value = DRONE.TRIANGLE_GAIN;

    osc3.connect(filter3);
    filter3.connect(gain3);
    gain3.connect(this.droneGain);

    [osc1, osc2, osc3, lfo1, lfo2, filterLfo].forEach(o => o.start(now));

    this.droneOscillators = [osc1, osc2, osc3];
    this.droneLFOs = [lfo1, lfo2, filterLfo];
    this.droneNodes = [gain1, gain2, gain3, lfoGain1, lfoGain2, filter3, filterLfoGain];
  }

  stopDrone(fadeTime = 2): void {
    if (!this.droneActive) return;
    this.droneActive = false;

    const oscs = this.droneOscillators;
    const lfos = this.droneLFOs;
    const nodes = this.droneNodes;
    this.droneOscillators = [];
    this.droneLFOs = [];
    this.droneNodes = [];

    if (fadeTime > 0) {
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, fadeTime / 3);
      setTimeout(() => this.cleanupDroneNodes(oscs, lfos, nodes), fadeTime * 1000 + 100);
    } else {
      this.droneGain.gain.value = 0;
      this.cleanupDroneNodes(oscs, lfos, nodes);
    }

    this.stopTension(0);
  }

  private cleanupDroneNodes(oscs: OscillatorNode[], lfos: OscillatorNode[], nodes: AudioNode[]): void {
    for (const osc of [...oscs, ...lfos]) {
      try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
    }
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* ok */ }
    }
  }

  setDroneIntensity(intensity: number): void {
    if (!this.droneActive) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const volume = DRONE.INTENSITY_MIN_VOLUME + clamped * DRONE.INTENSITY_MAX_VOLUME;
    this.droneGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.7);
  }

  setTensionLevel(level: number): void {
    const clamped = Math.max(0, Math.min(1, level));

    if (clamped > 0 && !this.tensionGain) {
      this.startTension();
    }

    const target = clamped * TENSION.MAX_GAIN;
    if (this.tensionGain && Math.abs(target - this.lastTensionTarget) > 0.0001) {
      this.lastTensionTarget = target;
      this.tensionGain.gain.setTargetAtTime(target, this.ctx.currentTime, TENSION.FADE_TIME / 3);
    }

    if (clamped === 0 && this.tensionGain) {
      this.stopTension(TENSION.FADE_TIME);
    }
  }

  private startTension(): void {
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = DRONE_FREQUENCIES.C2;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = DRONE_FREQUENCIES.C2 + TENSION.BEAT_FREQ_OFFSET;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = TENSION.LOWPASS_FREQ;

    this.tensionGain = this.ctx.createGain();
    this.tensionGain.gain.value = 0;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.tensionGain);
    this.tensionGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    this.tensionOscillators = [osc1, osc2];
  }

  private stopTension(fadeTime: number): void {
    if (!this.tensionGain) return;

    const oscs = this.tensionOscillators;
    const tg = this.tensionGain;
    this.tensionOscillators = [];
    this.tensionGain = null;
    this.lastTensionTarget = -1;

    if (fadeTime > 0) {
      tg.gain.setTargetAtTime(0, this.ctx.currentTime, fadeTime / 3);
      setTimeout(() => {
        for (const osc of oscs) {
          try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
        }
        try { tg.disconnect(); } catch { /* ok */ }
      }, fadeTime * 1000 + 100);
    } else {
      for (const osc of oscs) {
        try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
      }
      try { tg.disconnect(); } catch { /* ok */ }
    }
  }
}
