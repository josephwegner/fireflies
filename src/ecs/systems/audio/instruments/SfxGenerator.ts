import { GAIN_FLOOR, LOOKAHEAD, type AudioGraph, type VoiceNode } from '../VoicePool';

const SPAWN = {
  PITCH_RISE_SEMITONES: 3,
  FIREFLY_VELOCITY: 0.08,
  MONSTER_VELOCITY_MULT: 1.2,
  MONSTER_LOWPASS: 300,
  MONSTER_PITCH_START_MULT: 1.5,
  MONSTER_ATTACK: 0.2,
  FIREFLY_ATTACK: 0.1,
  RELEASE: 0.5,
  REVERB_SEND_MONSTER: 0.4,
  REVERB_SEND_FIREFLY: 0.3,
  DURATION: 0.55,
};

const DEATH = {
  FIREFLY_START_FREQ: 261.63,
  FIREFLY_PITCH_DROP: 0.667,
  FIREFLY_VELOCITY: 0.1,
  FIREFLY_REVERB: 0.4,
  MONSTER_NOISE_DURATION: 0.25,
  MONSTER_LOWPASS: 400,
  MONSTER_VELOCITY: 0.15,
  MONSTER_REVERB: 0.3,
  WISP_NOTE_1: 192.0,
  WISP_NOTE_2: 161.63,
  WISP_VELOCITY: 0.1,
  WISP_REVERB: 0.6,
};

const CONSTRUCTION = {
  BANDPASS_NORMAL: 800,
  BANDPASS_BRIGHT: 1200,
  BANDPASS_Q: 5,
  TONE_FREQ_NORMAL: 174.61,
  TONE_FREQ_BRIGHT: 196.0,
  TONE_DECAY: 0.08,
  NOISE_DECAY: 0.15,
  REVERB_NORMAL: 0.2,
  REVERB_BRIGHT: 0.35,
  DEFAULT_VELOCITY: 0.12,
  DURATION: 0.2,
};

const BREAK = {
  BAND_FREQS: [300, 600, 900, 1200],
  BAND_Q: 3,
  BURST_STAGGER: 0.05,
  BURST_DURATION: 0.06,
  BURST_VELOCITY: 0.1,
  LOW_START_FREQ: 155.56,
  LOW_END_FREQ: 65.41,
  LOW_DROP_TIME: 0.1,
  LOW_VELOCITY: 0.12,
  LOW_DECAY: 0.25,
  REVERB_SEND: 0.3,
  DURATION: 0.35,
};

export class SfxGenerator {
  private graph: AudioGraph;

  constructor(graph: AudioGraph) {
    this.graph = graph;
  }

  playSpawn(frequency: number, type: 'firefly' | 'monster', velocity = SPAWN.FIREFLY_VELOCITY): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    if (type === 'monster') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * SPAWN.MONSTER_PITCH_START_MULT, now);
      osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.3);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = SPAWN.MONSTER_LOWPASS;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(velocity * SPAWN.MONSTER_VELOCITY_MULT, now + SPAWN.MONSTER_ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + SPAWN.RELEASE);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = SPAWN.REVERB_SEND_MONSTER;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      gain.connect(reverbGain);
      reverbGain.connect(reverbSend);

      osc.start(now);
      osc.stop(now + SPAWN.DURATION);

      const voice: VoiceNode = { source: osc, nodes: [osc, filter, gain, reverbGain] };
      voicePool.add(voice);
      voicePool.scheduleCleanup(voice);
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const targetFreq = frequency * Math.pow(2, SPAWN.PITCH_RISE_SEMITONES / 12);
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(velocity, now + SPAWN.FIREFLY_ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + SPAWN.RELEASE);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = SPAWN.REVERB_SEND_FIREFLY;

      osc.connect(gain);
      gain.connect(sfxGain);
      gain.connect(reverbGain);
      reverbGain.connect(reverbSend);

      osc.start(now);
      osc.stop(now + SPAWN.DURATION);

      const voice: VoiceNode = { source: osc, nodes: [osc, gain, reverbGain] };
      voicePool.add(voice);
      voicePool.scheduleCleanup(voice);
    }
  }

  playDeath(type: 'firefly' | 'monster' | 'wisp'): void {
    switch (type) {
      case 'firefly': return this.playFireflyDeath();
      case 'monster': return this.playMonsterDeath();
      case 'wisp': return this.playWispDeath();
    }
  }

  private playFireflyDeath(): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(DEATH.FIREFLY_START_FREQ, now);
    osc.frequency.exponentialRampToValueAtTime(DEATH.FIREFLY_START_FREQ * DEATH.FIREFLY_PITCH_DROP, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(DEATH.FIREFLY_VELOCITY, now);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + 0.5);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = DEATH.FIREFLY_REVERB;

    osc.connect(gain);
    gain.connect(sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    osc.start(now);
    osc.stop(now + 0.55);

    const voice: VoiceNode = { source: osc, nodes: [osc, gain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  private playMonsterDeath(): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const noise = ctx.createBufferSource();
    noise.buffer = voicePool.createNoiseBuffer(DEATH.MONSTER_NOISE_DURATION);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = DEATH.MONSTER_LOWPASS;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(DEATH.MONSTER_VELOCITY, now);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + DEATH.MONSTER_NOISE_DURATION);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = DEATH.MONSTER_REVERB;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    noise.start(now);

    const voice: VoiceNode = { source: noise, nodes: [noise, filter, gain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  private playWispDeath(): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = DEATH.WISP_NOTE_1;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = DEATH.WISP_NOTE_2;

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(DEATH.WISP_VELOCITY, now);
    gain1.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + 0.8);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0;
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(DEATH.WISP_VELOCITY, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + 1.0);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = DEATH.WISP_REVERB;

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(sfxGain);
    gain2.connect(sfxGain);
    gain1.connect(reverbGain);
    gain2.connect(reverbGain);
    reverbGain.connect(reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1);
    osc2.stop(now + 1.1);

    const voice: VoiceNode = { source: osc2, nodes: [osc1, osc2, gain1, gain2, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  playConstruction(bright = false, velocity = CONSTRUCTION.DEFAULT_VELOCITY): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const noise = ctx.createBufferSource();
    noise.buffer = voicePool.createNoiseBuffer(CONSTRUCTION.NOISE_DECAY);

    const filterFreq = bright ? CONSTRUCTION.BANDPASS_BRIGHT : CONSTRUCTION.BANDPASS_NORMAL;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = CONSTRUCTION.BANDPASS_Q;

    const toneFreq = bright ? CONSTRUCTION.TONE_FREQ_BRIGHT : CONSTRUCTION.TONE_FREQ_NORMAL;
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = toneFreq;

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(velocity * 0.5, now);
    toneGain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + CONSTRUCTION.TONE_DECAY);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity, now);
    noiseGain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + CONSTRUCTION.NOISE_DECAY);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = bright ? CONSTRUCTION.REVERB_BRIGHT : CONSTRUCTION.REVERB_NORMAL;

    noise.connect(filter);
    filter.connect(noiseGain);
    tone.connect(toneGain);
    noiseGain.connect(sfxGain);
    toneGain.connect(sfxGain);
    noiseGain.connect(reverbGain);
    toneGain.connect(reverbGain);
    reverbGain.connect(reverbSend);

    noise.start(now);
    tone.start(now);
    tone.stop(now + CONSTRUCTION.DURATION);

    const voice: VoiceNode = { source: tone, nodes: [noise, filter, noiseGain, tone, toneGain, reverbGain] };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }

  playBreak(): void {
    const { ctx, sfxGain, reverbSend, voicePool } = this.graph;
    const now = ctx.currentTime + LOOKAHEAD;

    const allNodes: AudioNode[] = [];

    const masterBurstGain = ctx.createGain();
    masterBurstGain.gain.value = 1;
    masterBurstGain.connect(sfxGain);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = BREAK.REVERB_SEND;
    reverbGain.connect(reverbSend);
    masterBurstGain.connect(reverbGain);

    allNodes.push(masterBurstGain, reverbGain);

    for (let i = 0; i < BREAK.BAND_FREQS.length; i++) {
      const offset = i * BREAK.BURST_STAGGER;
      const noise = ctx.createBufferSource();
      noise.buffer = voicePool.createNoiseBuffer(BREAK.BURST_DURATION);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = BREAK.BAND_FREQS[i];
      filter.Q.value = BREAK.BAND_Q;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(BREAK.BURST_VELOCITY, now + offset);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + offset + BREAK.BURST_DURATION);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterBurstGain);

      noise.start(now + offset);
      allNodes.push(noise, filter, gain);
    }

    const lowOsc = ctx.createOscillator();
    lowOsc.type = 'sine';
    lowOsc.frequency.setValueAtTime(BREAK.LOW_START_FREQ, now);
    lowOsc.frequency.exponentialRampToValueAtTime(BREAK.LOW_END_FREQ, now + BREAK.LOW_DROP_TIME);

    const lowGain = ctx.createGain();
    lowGain.gain.setValueAtTime(BREAK.LOW_VELOCITY, now);
    lowGain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + BREAK.LOW_DECAY);

    lowOsc.connect(lowGain);
    lowGain.connect(masterBurstGain);

    lowOsc.start(now);
    lowOsc.stop(now + 0.3);

    allNodes.push(lowOsc, lowGain);

    const voice: VoiceNode = { source: lowOsc, nodes: allNodes };
    voicePool.add(voice);
    voicePool.scheduleCleanup(voice);
  }
}
