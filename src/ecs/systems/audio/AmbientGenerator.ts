import { GAIN_FLOOR, LOOKAHEAD, type AudioGraph, type VoiceNode } from './VoicePool';
import { SCALE_FREQUENCIES } from './scales';

const AMBIENT = {
  MIN_INTERVAL: 1,
  MAX_INTERVAL: 5,
  NOTE_SPACING: 0.18,
  VELOCITY_BASE: 0.04,
  VELOCITY_FIREFLY: 0.02,
  ATTACK: 0.15,
  RELEASE: 4.0,
  DETUNE_RATIO: 1.003,
  BANDPASS_FREQ: 1800,
  BANDPASS_Q: 0.8,
  REVERB_SEND: 0.8,
  OCTAVE_HIGH: 1,
  OCTAVE_LOW: 0,
  MIN_NOTES: 2,
  MAX_NOTES: 6,
};

export class AmbientGenerator {
  private graph: AudioGraph;
  private active = false;
  private nextTime = 0;
  private mood = 0.5;

  constructor(graph: AudioGraph) {
    this.graph = graph;
  }

  start(): void {
    this.active = true;
    this.nextTime = this.graph.ctx.currentTime + 2;
  }

  stop(): void {
    this.active = false;
  }

  setMood(fireflyRatio: number): void {
    this.mood = Math.max(0, Math.min(1, fireflyRatio));
  }

  update(): void {
    if (!this.active) return;

    if (this.graph.ctx.currentTime >= this.nextTime) {
      this.playFragment();
      const interval = AMBIENT.MIN_INTERVAL +
        Math.random() * (AMBIENT.MAX_INTERVAL - AMBIENT.MIN_INTERVAL);
      this.nextTime = this.graph.ctx.currentTime + interval;
    }
  }

  private playFragment(): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;
    const noteCount = AMBIENT.MIN_NOTES +
      Math.floor(Math.random() * (AMBIENT.MAX_NOTES - AMBIENT.MIN_NOTES + 1));

    const octave = AMBIENT.OCTAVE_LOW + this.mood * (AMBIENT.OCTAVE_HIGH - AMBIENT.OCTAVE_LOW);
    const octaveShift = Math.pow(2, octave);
    const velocity = AMBIENT.VELOCITY_BASE + this.mood * AMBIENT.VELOCITY_FIREFLY;

    const startIdx = Math.floor(Math.random() * SCALE_FREQUENCIES.length);
    const direction = Math.random() > 0.5 ? 1 : -1;

    for (let i = 0; i < noteCount; i++) {
      const noteIdx = ((startIdx + i * direction) % SCALE_FREQUENCIES.length + SCALE_FREQUENCIES.length) % SCALE_FREQUENCIES.length;
      const freq = SCALE_FREQUENCIES[noteIdx] * octaveShift;
      const startTime = now + i * AMBIENT.NOTE_SPACING;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * AMBIENT.DETUNE_RATIO;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = AMBIENT.BANDPASS_FREQ;
      filter.Q.value = AMBIENT.BANDPASS_Q;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(velocity, startTime + AMBIENT.ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, startTime + AMBIENT.ATTACK + AMBIENT.RELEASE);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = AMBIENT.REVERB_SEND;
      gain.connect(reverbGain);
      reverbGain.connect(reverbSend);

      const duration = AMBIENT.ATTACK + AMBIENT.RELEASE + 0.1;
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);

      const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, filter, gain, reverbGain] };
      voicePool.add(voice);
      voicePool.scheduleCleanup(voice);
    }
  }
}
