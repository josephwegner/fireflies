import { GAIN_FLOOR, LOOKAHEAD, type AudioGraph, type VoiceNode } from '../VoicePool';

const BASS_PULSE = {
  SUB_GAIN: 0.6,
  LOWPASS_FREQ: 200,
  SATURATION: 1.5,
  ATTACK: 0.01,
  SUSTAIN_END: 0.11,
  RELEASE: 0.6,
  REVERB_SEND: 0.5,
  DEFAULT_VELOCITY: 0.6,
  DURATION: 0.65,
};

const WISP_PULSE = {
  TRIANGLE_MIX: 0.05,
  HIGHPASS_FREQ: 800,
  ATTACK: 0.01,
  SUSTAIN_END: 0.055,
  RELEASE: 0.4,
  REVERB_SEND: 0.4,
  DEFAULT_VELOCITY: 0.15,
  DURATION: 0.45,
};

export class BassPulseGenerator {
  private graph: AudioGraph;

  constructor(graph: AudioGraph) {
    this.graph = graph;
  }

  playBassPulse(frequency: number, velocity = BASS_PULSE.DEFAULT_VELOCITY): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency / 2;

    const subGain = ctx.createGain();
    subGain.gain.value = BASS_PULSE.SUB_GAIN;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = BASS_PULSE.LOWPASS_FREQ;

    const waveshaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * BASS_PULSE.SATURATION);
    }
    waveshaper.curve = curve;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + BASS_PULSE.ATTACK);
    gain.gain.setValueAtTime(velocity, now + BASS_PULSE.SUSTAIN_END);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + BASS_PULSE.RELEASE);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = BASS_PULSE.REVERB_SEND;

    osc1.connect(filter);
    osc2.connect(subGain);
    subGain.connect(filter);
    filter.connect(waveshaper);
    waveshaper.connect(gain);
    gain.connect(sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + BASS_PULSE.DURATION);
    osc2.stop(now + BASS_PULSE.DURATION);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, subGain, filter, waveshaper, gain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  playWispPulse(frequency: number, velocity = WISP_PULSE.DEFAULT_VELOCITY): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = frequency;

    const triGain = ctx.createGain();
    triGain.gain.value = WISP_PULSE.TRIANGLE_MIX;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = WISP_PULSE.HIGHPASS_FREQ;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + WISP_PULSE.ATTACK);
    gain.gain.setValueAtTime(velocity, now + WISP_PULSE.SUSTAIN_END);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + WISP_PULSE.RELEASE);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = WISP_PULSE.REVERB_SEND;

    osc1.connect(filter);
    osc2.connect(triGain);
    triGain.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + WISP_PULSE.DURATION);
    osc2.stop(now + WISP_PULSE.DURATION);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, triGain, filter, gain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }
}
