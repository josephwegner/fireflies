import { GAIN_FLOOR, LOOKAHEAD, type AudioGraph, type VoiceNode } from '../VoicePool';

const WOOD_TAP = {
  PITCH_DROP_RATIO: 0.5,
  PITCH_DROP_TIME: 0.03,
  BANDPASS_FREQ: 1200,
  BANDPASS_Q: 3,
  DECAY: 0.1,
  REVERB_SEND: 0.15,
  DEFAULT_VELOCITY: 0.5,
  DURATION: 0.12,
};

export class WoodTapGenerator {
  private graph: AudioGraph;

  constructor(graph: AudioGraph) {
    this.graph = graph;
  }

  playWoodTap(frequency: number, velocity = WOOD_TAP.DEFAULT_VELOCITY): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * WOOD_TAP.PITCH_DROP_RATIO, now + WOOD_TAP.PITCH_DROP_TIME);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = WOOD_TAP.BANDPASS_FREQ;
    filter.Q.value = WOOD_TAP.BANDPASS_Q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity, now);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + WOOD_TAP.DECAY);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = WOOD_TAP.REVERB_SEND;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    osc.start(now);
    osc.stop(now + WOOD_TAP.DURATION);

    const voice: VoiceNode = { source: osc, nodes: [osc, filter, gain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }
}
