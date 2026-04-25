import { GAIN_FLOOR, LOOKAHEAD, type AudioGraph, type VoiceNode } from './VoicePool';

const MOTIF = {
  DEFAULT_SPACING: 0.15,
  DEFAULT_VELOCITY: 0.12,
  DEFAULT_REVERB: 0.6,
  NOTE_ATTACK: 0.01,
  NOTE_SUSTAIN: 0.1,
  NOTE_RELEASE: 0.4,
  LAST_NOTE_RELEASE: 0.8,
};

const DEFEAT_MOTIF = {
  SPACING: 0.3,
  DETUNE_CENTS: -25,
  LOWPASS_FREQ: 600,
  ATTACK: 0.2,
  RELEASE: 2.0,
  VELOCITY: 0.1,
  REVERB_SEND: 0.7,
};

export class MotifComposer {
  private graph: AudioGraph;

  constructor(graph: AudioGraph) {
    this.graph = graph;
  }

  playMotif(notes: number[], spacing = MOTIF.DEFAULT_SPACING, velocity = MOTIF.DEFAULT_VELOCITY, reverbAmount = MOTIF.DEFAULT_REVERB): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;
    const allNodes: AudioNode[] = [];
    let lastOsc: OscillatorNode | null = null;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = reverbAmount;
    reverbGain.connect(reverbSend);
    allNodes.push(reverbGain);

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * spacing;
      const isLast = i === notes.length - 1;
      const release = isLast ? MOTIF.LAST_NOTE_RELEASE : MOTIF.NOTE_RELEASE;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      lastOsc = osc;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(velocity, t + MOTIF.NOTE_ATTACK);
      gain.gain.setValueAtTime(velocity, t + MOTIF.NOTE_SUSTAIN);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, t + release);

      osc.connect(gain);
      gain.connect(sfxGain);
      gain.connect(reverbGain);

      osc.start(t);
      osc.stop(t + release + 0.05);
      allNodes.push(osc, gain);
    }

    const voice: VoiceNode = { source: lastOsc!, nodes: allNodes };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  playDefeatMotif(notes: number[]): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;
    const allNodes: AudioNode[] = [];
    let lastOsc: OscillatorNode | null = null;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = DEFEAT_MOTIF.REVERB_SEND;
    reverbGain.connect(reverbSend);
    allNodes.push(reverbGain);

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * DEFEAT_MOTIF.SPACING;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = notes[i] * Math.pow(2, DEFEAT_MOTIF.DETUNE_CENTS / 1200);
      lastOsc = osc;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = DEFEAT_MOTIF.LOWPASS_FREQ;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(DEFEAT_MOTIF.VELOCITY, t + DEFEAT_MOTIF.ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, t + DEFEAT_MOTIF.RELEASE);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      gain.connect(reverbGain);

      osc.start(t);
      osc.stop(t + DEFEAT_MOTIF.RELEASE + 0.2);
      allNodes.push(osc, filter, gain);
    }

    const voice: VoiceNode = { source: lastOsc!, nodes: allNodes };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }
}
