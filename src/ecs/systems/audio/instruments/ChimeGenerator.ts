import { GAIN_FLOOR, LOOKAHEAD, type AudioGraph, type VoiceNode } from '../VoicePool';

const CHIME = {
  DETUNE_RATIO: 1.004,
  BANDPASS_FREQ: 2000,
  BANDPASS_Q: 2,
  ATTACK: 0.08,
  RELEASE: 1.8,
  DEFAULT_VELOCITY: 0.15,
  DEFAULT_REVERB: 0.7,
  DURATION: 2,
};

const WISP_ACTIVATION = {
  NOTE_1: 392.0,
  NOTE_2: 523.25,
  NOTE_SPACING: 0.12,
  DETUNE_RATIO: 1.006,
  BANDPASS_FREQ: 2500,
  BANDPASS_Q: 1.5,
  ATTACK: 0.02,
  RELEASE: 1.2,
  VELOCITY: 0.18,
  REVERB_SEND: 0.7,
  DURATION: 1.5,
};

export class ChimeGenerator {
  private graph: AudioGraph;

  constructor(graph: AudioGraph) {
    this.graph = graph;
  }

  playChime(frequency: number, reverbAmount = CHIME.DEFAULT_REVERB, velocity = CHIME.DEFAULT_VELOCITY): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * CHIME.DETUNE_RATIO;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = CHIME.BANDPASS_FREQ;
    filter.Q.value = CHIME.BANDPASS_Q;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + CHIME.ATTACK);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + CHIME.RELEASE);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = reverbAmount;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + CHIME.DURATION);
    osc2.stop(now + CHIME.DURATION);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, filter, gain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  playWispActivation(): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;
    const notes = [WISP_ACTIVATION.NOTE_1, WISP_ACTIVATION.NOTE_2];

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * WISP_ACTIVATION.NOTE_SPACING;
      const freq = notes[i];

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * WISP_ACTIVATION.DETUNE_RATIO;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = WISP_ACTIVATION.BANDPASS_FREQ;
      filter.Q.value = WISP_ACTIVATION.BANDPASS_Q;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(WISP_ACTIVATION.VELOCITY, startTime + WISP_ACTIVATION.ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, startTime + WISP_ACTIVATION.ATTACK + WISP_ACTIVATION.RELEASE);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = WISP_ACTIVATION.REVERB_SEND;
      gain.connect(reverbGain);
      reverbGain.connect(reverbSend);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + WISP_ACTIVATION.ATTACK + WISP_ACTIVATION.RELEASE + 0.1);
      osc2.stop(startTime + WISP_ACTIVATION.ATTACK + WISP_ACTIVATION.RELEASE + 0.1);

      const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, filter, gain, reverbGain] };
      voicePool.add(voice);
      voicePool.scheduleCleanup(voice);
    }
  }
}
