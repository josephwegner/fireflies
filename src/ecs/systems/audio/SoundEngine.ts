import { DRONE_FREQUENCIES } from './scales';

// ─── Audio Tuning Constants ────────────────────────────────────────────────
// Gain values are 0–1 where ~0.1 is quiet, ~0.5 is moderate, ~1.0 is loud.
// Frequencies are in Hz. Time values are in seconds unless noted.

const MASTER_VOLUME = 0.8;

const REVERB = {
  SEND_LEVEL: 0.4,       // how much dry signal feeds into reverb (0 = none, 1 = full)
  RETURN_LEVEL: 0.5,     // how loud the reverb output is mixed back in
  // Prime-ratio delay times avoid comb-filter artifacts (metallic ringing)
  // No feedback — each tap plays once and stops, preventing any buildup
  DELAY_TIMES: [0.031, 0.073, 0.113, 0.171],
  TAP_GAINS: [0.4, 0.3, 0.2, 0.15],  // each tap gets quieter — simulates natural decay
  // Per-tap lowpass cutoff: later taps are darker (lower = darker/warmer)
  FILTER_FREQS: [3000, 2500, 2000, 1500],
};

const CHIME = {
  DETUNE_RATIO: 1.004,   // ~7 cents sharp — two oscillators beating slowly
  BANDPASS_FREQ: 2000,    // center frequency of the bell-like resonance
  BANDPASS_Q: 2,          // moderate resonance width
  ATTACK: 0.08,           // slow fade-in for soft onset
  RELEASE: 1.8,           // long exponential decay for ethereal tail
  DEFAULT_VELOCITY: 0.15,
  DEFAULT_REVERB: 0.7,    // high reverb send for diffuse shimmer
  DURATION: 2,
};

const WOOD_TAP = {
  PITCH_DROP_RATIO: 0.5,  // drops one octave during the transient
  PITCH_DROP_TIME: 0.03,  // very fast pitch sweep = percussive "knock"
  BANDPASS_FREQ: 1200,    // midrange body, avoids tinny or boomy extremes
  BANDPASS_Q: 3,          // tight resonance for a "hollow wood" character
  DECAY: 0.1,             // short — a tap, not a tone
  REVERB_SEND: 0.15,      // minimal reverb keeps it dry and punchy
  DEFAULT_VELOCITY: 0.5,
  DURATION: 0.12,
};

const BASS_PULSE = {
  SUB_GAIN: 0.6,          // sub-harmonic (one octave below) mixed quieter than fundamental
  LOWPASS_FREQ: 200,      // only the deep bass passes through
  SATURATION: 1.5,        // tanh waveshaper drive — adds warmth without distortion
  ATTACK: 0.01,
  SUSTAIN_END: 0.11,      // sustain plateau before release begins
  RELEASE: 0.6,
  REVERB_SEND: 0.5,
  DEFAULT_VELOCITY: 0.6,
  DURATION: 0.65,
};

const WISP_PULSE = {
  TRIANGLE_MIX: 0.5,     // triangle oscillator blended quieter than the sine
  HIGHPASS_FREQ: 400,     // removes low-end so it doesn't clash with bass pulse
  ATTACK: 0.005,
  SUSTAIN_END: 0.055,
  RELEASE: 0.4,
  REVERB_SEND: 0.4,
  DEFAULT_VELOCITY: 0.35,
  DURATION: 0.45,
};

const SPAWN = {
  PITCH_RISE_SEMITONES: 3,  // minor third up — a small hopeful lift
  FIREFLY_VELOCITY: 0.08,
  MONSTER_VELOCITY_MULT: 1.5,
  MONSTER_LOWPASS: 300,      // keeps monster spawn dark and ominous
  MONSTER_PITCH_START_MULT: 1.5,  // starts a fifth above, drops down
  MONSTER_ATTACK: 0.4,
  FIREFLY_ATTACK: 0.1,
  RELEASE: 0.5,
  REVERB_SEND_MONSTER: 0.4,
  REVERB_SEND_FIREFLY: 0.3,
  DURATION: 0.55,
};

const DEATH = {
  FIREFLY_START_FREQ: 261.63,  // C4
  FIREFLY_PITCH_DROP: 0.667,   // down a fifth
  FIREFLY_VELOCITY: 0.1,
  FIREFLY_REVERB: 0.4,
  MONSTER_NOISE_DURATION: 0.25,
  MONSTER_LOWPASS: 400,
  MONSTER_VELOCITY: 0.15,
  MONSTER_REVERB: 0.3,
  WISP_NOTE_1: 392.0,   // G4 — starts high
  WISP_NOTE_2: 261.63,  // C4 — descends to root
  WISP_VELOCITY: 0.1,
  WISP_REVERB: 0.6,
};

const CONSTRUCTION = {
  BANDPASS_NORMAL: 800,
  BANDPASS_BRIGHT: 1200,
  BANDPASS_Q: 5,           // narrow band = distinct tonal quality in the noise
  TONE_FREQ_NORMAL: 174.61,  // F3
  TONE_FREQ_BRIGHT: 196.0,   // G3
  TONE_DECAY: 0.08,
  NOISE_DECAY: 0.15,
  REVERB_NORMAL: 0.2,
  REVERB_BRIGHT: 0.35,
  DEFAULT_VELOCITY: 0.12,
  DURATION: 0.2,
};

const BREAK = {
  BAND_FREQS: [300, 600, 900, 1200],  // staggered frequency bands for crumbling texture
  BAND_Q: 3,
  BURST_STAGGER: 0.05,     // seconds between each noise burst
  BURST_DURATION: 0.06,
  BURST_VELOCITY: 0.1,
  LOW_START_FREQ: 155.56,  // Eb3
  LOW_END_FREQ: 65.41,     // C2 — pitch drops during impact
  LOW_DROP_TIME: 0.1,
  LOW_VELOCITY: 0.12,
  LOW_DECAY: 0.25,
  REVERB_SEND: 0.3,
  DURATION: 0.35,
};

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
  DETUNE_CENTS: -25,      // slightly flat — unsettling, mournful
  LOWPASS_FREQ: 600,       // muffled tone
  ATTACK: 0.2,             // slow onset = heavy, dragging feel
  RELEASE: 2.0,            // very long fade
  VELOCITY: 0.1,
  REVERB_SEND: 0.7,
};

const WISP_ACTIVATION = {
  NOTE_1: 392.0,           // G4 — opening note
  NOTE_2: 523.25,          // C5 — rising to a bright resolution
  NOTE_SPACING: 0.12,      // seconds between the two notes
  DETUNE_RATIO: 1.006,     // ~10 cents — slightly wider shimmer than placement chime
  BANDPASS_FREQ: 2500,     // brighter than placement chime (2000)
  BANDPASS_Q: 1.5,
  ATTACK: 0.02,
  RELEASE: 1.2,
  VELOCITY: 0.18,
  REVERB_SEND: 0.7,
  DURATION: 1.5,
};

const DRONE = {
  FADE_IN: 3,
  INITIAL_VOLUME: 0.02,
  OSC_GAIN: 0.05,          // per-oscillator level within the drone bus
  LFO_RATE_1: 0.05,        // Hz — very slow breathing modulation
  LFO_RATE_2: 0.037,       // offset from LFO_1 so the two oscillators "drift"
  LFO_DEPTH: 0.02,         // gain modulation amount (±0.02 around OSC_GAIN)
  TRIANGLE_GAIN: 0.02,     // C3 triangle layer — subtle texture
  FILTER_CENTER: 200,      // lowpass on the triangle layer
  FILTER_LFO_RATE: 0.02,   // very slow filter sweep
  FILTER_LFO_DEPTH: 150,   // sweeps filter ±150Hz around FILTER_CENTER
  // Intensity maps game state (0–1) to drone volume:
  INTENSITY_MIN_VOLUME: 0.05,
  INTENSITY_MAX_VOLUME: 0.08,  // INTENSITY_MIN + this * intensity
};

const TENSION = {
  BEAT_FREQ_OFFSET: 3,    // Hz — creates unsettling 3Hz beating between two close sines
  LOWPASS_FREQ: 150,       // felt-not-heard sub-bass rumble
  MAX_GAIN: 0.04,          // at full tension (6 monsters)
  FADE_TIME: 3,            // seconds — used for start/stop and intensity fades
};

// ─── Voice Management ──────────────────────────────────────────────────────

const MAX_VOICES = 16;
const GAIN_FLOOR = 0.001;  // exponentialRamp target — must be >0
const LOOKAHEAD = 0.005;   // schedule voices 5ms in the future so gain automation is in place before playback

interface VoiceNode {
  source: OscillatorNode | AudioBufferSourceNode;
  nodes: AudioNode[];
}

export class SoundEngine {
  private ctx: AudioContext;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private droneGain!: GainNode;
  private reverbSend!: GainNode;
  private reverbReturn!: GainNode;

  private activeVoices: Set<VoiceNode> = new Set();
  private droneOscillators: OscillatorNode[] = [];
  private droneLFOs: OscillatorNode[] = [];
  private droneNodes: AudioNode[] = [];
  private tensionOscillators: OscillatorNode[] = [];
  private tensionGain: GainNode | null = null;
  private lastTensionTarget = -1;
  private droneActive = false;
  private initialized = false;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
  }

  initialize(): void {
    if (this.initialized) return;

    if (this.ctx.state === 'suspended') {
      const resume = () => {
        this.ctx.resume();
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
    this.stopDrone(0);
    this.stopTension(0);

    for (const voice of this.activeVoices) {
      this.killVoice(voice);
    }
    this.activeVoices.clear();

    this.initialized = false;
    this.ctx.close().catch(() => {});
  }

  private killVoice(voice: VoiceNode): void {
    const fadeOut = 0.02;
    const now = this.ctx.currentTime;

    for (const node of voice.nodes) {
      if (node instanceof GainNode) {
        try {
          node.gain.cancelScheduledValues(now);
          node.gain.setValueAtTime(node.gain.value, now);
          node.gain.linearRampToValueAtTime(0, now + fadeOut);
        } catch { /* ok */ }
      }
    }

    setTimeout(() => {
      try {
        if (voice.source instanceof OscillatorNode) {
          voice.source.stop();
        }
        if (voice.source instanceof AudioBufferSourceNode) {
          voice.source.stop();
        }
      } catch { /* already stopped */ }
      for (const node of voice.nodes) {
        try { node.disconnect(); } catch { /* already disconnected */ }
      }
    }, fadeOut * 1000 + 5);
  }

  private addVoice(voice: VoiceNode): void {
    if (this.activeVoices.size >= MAX_VOICES) {
      const oldest = this.activeVoices.values().next().value!;
      this.killVoice(oldest);
      this.activeVoices.delete(oldest);
    }
    this.activeVoices.add(voice);
  }

  private removeVoice(voice: VoiceNode): void {
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* ok */ }
    }
    this.activeVoices.delete(voice);
  }

  private scheduleCleanup(voice: VoiceNode, duration: number): void {
    const source = voice.source;
    if (source instanceof OscillatorNode) {
      source.onended = () => this.removeVoice(voice);
    } else {
      setTimeout(() => this.removeVoice(voice), duration * 1000);
    }
  }

  createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ─── One-shot instrument methods ─────────────────────────────────────────

  playChime(frequency: number, reverbAmount = CHIME.DEFAULT_REVERB, velocity = CHIME.DEFAULT_VELOCITY): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * CHIME.DETUNE_RATIO;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = CHIME.BANDPASS_FREQ;
    filter.Q.value = CHIME.BANDPASS_Q;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + CHIME.ATTACK);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + CHIME.RELEASE);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = reverbAmount;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + CHIME.DURATION);
    osc2.stop(now + CHIME.DURATION);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, filter, gain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, CHIME.DURATION);
  }

  playWispActivation(): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;
    const notes = [WISP_ACTIVATION.NOTE_1, WISP_ACTIVATION.NOTE_2];

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * WISP_ACTIVATION.NOTE_SPACING;
      const freq = notes[i];

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * WISP_ACTIVATION.DETUNE_RATIO;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = WISP_ACTIVATION.BANDPASS_FREQ;
      filter.Q.value = WISP_ACTIVATION.BANDPASS_Q;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(WISP_ACTIVATION.VELOCITY, startTime + WISP_ACTIVATION.ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, startTime + WISP_ACTIVATION.ATTACK + WISP_ACTIVATION.RELEASE);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = WISP_ACTIVATION.REVERB_SEND;
      gain.connect(reverbGain);
      reverbGain.connect(this.reverbSend);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + WISP_ACTIVATION.ATTACK + WISP_ACTIVATION.RELEASE + 0.1);
      osc2.stop(startTime + WISP_ACTIVATION.ATTACK + WISP_ACTIVATION.RELEASE + 0.1);

      const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, filter, gain, reverbGain] };
      this.addVoice(voice);
      this.scheduleCleanup(voice, WISP_ACTIVATION.DURATION + i * WISP_ACTIVATION.NOTE_SPACING);
    }
  }

  playWoodTap(frequency: number, velocity = WOOD_TAP.DEFAULT_VELOCITY): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * WOOD_TAP.PITCH_DROP_RATIO, now + WOOD_TAP.PITCH_DROP_TIME);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = WOOD_TAP.BANDPASS_FREQ;
    filter.Q.value = WOOD_TAP.BANDPASS_Q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(velocity, now);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + WOOD_TAP.DECAY);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = WOOD_TAP.REVERB_SEND;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    osc.start(now);
    osc.stop(now + WOOD_TAP.DURATION);

    const voice: VoiceNode = { source: osc, nodes: [osc, filter, gain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, WOOD_TAP.DURATION);
  }

  playBassPulse(frequency: number, velocity = BASS_PULSE.DEFAULT_VELOCITY): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency / 2;

    const subGain = this.ctx.createGain();
    subGain.gain.value = BASS_PULSE.SUB_GAIN;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = BASS_PULSE.LOWPASS_FREQ;

    const waveshaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * BASS_PULSE.SATURATION);
    }
    waveshaper.curve = curve;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + BASS_PULSE.ATTACK);
    gain.gain.setValueAtTime(velocity, now + BASS_PULSE.SUSTAIN_END);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + BASS_PULSE.RELEASE);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = BASS_PULSE.REVERB_SEND;

    osc1.connect(filter);
    osc2.connect(subGain);
    subGain.connect(filter);
    filter.connect(waveshaper);
    waveshaper.connect(gain);
    gain.connect(this.sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + BASS_PULSE.DURATION);
    osc2.stop(now + BASS_PULSE.DURATION);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, subGain, filter, waveshaper, gain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, BASS_PULSE.DURATION);
  }

  playWispPulse(frequency: number, velocity = WISP_PULSE.DEFAULT_VELOCITY): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = frequency;

    const triGain = this.ctx.createGain();
    triGain.gain.value = WISP_PULSE.TRIANGLE_MIX;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = WISP_PULSE.HIGHPASS_FREQ;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + WISP_PULSE.ATTACK);
    gain.gain.setValueAtTime(velocity, now + WISP_PULSE.SUSTAIN_END);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + WISP_PULSE.RELEASE);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = WISP_PULSE.REVERB_SEND;

    osc1.connect(filter);
    osc2.connect(triGain);
    triGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + WISP_PULSE.DURATION);
    osc2.stop(now + WISP_PULSE.DURATION);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, triGain, filter, gain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, WISP_PULSE.DURATION);
  }

  playSpawn(frequency: number, type: 'firefly' | 'monster', velocity = SPAWN.FIREFLY_VELOCITY): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    if (type === 'monster') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * SPAWN.MONSTER_PITCH_START_MULT, now);
      osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.3);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = SPAWN.MONSTER_LOWPASS;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(velocity * SPAWN.MONSTER_VELOCITY_MULT, now + SPAWN.MONSTER_ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + SPAWN.RELEASE);

      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = SPAWN.REVERB_SEND_MONSTER;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      gain.connect(reverbGain);
      reverbGain.connect(this.reverbSend);

      osc.start(now);
      osc.stop(now + SPAWN.DURATION);

      const voice: VoiceNode = { source: osc, nodes: [osc, filter, gain, reverbGain] };
      this.addVoice(voice);
      this.scheduleCleanup(voice, SPAWN.DURATION);
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const targetFreq = frequency * Math.pow(2, SPAWN.PITCH_RISE_SEMITONES / 12);
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(velocity, now + SPAWN.FIREFLY_ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + SPAWN.RELEASE);

      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = SPAWN.REVERB_SEND_FIREFLY;

      osc.connect(gain);
      gain.connect(this.sfxGain);
      gain.connect(reverbGain);
      reverbGain.connect(this.reverbSend);

      osc.start(now);
      osc.stop(now + SPAWN.DURATION);

      const voice: VoiceNode = { source: osc, nodes: [osc, gain, reverbGain] };
      this.addVoice(voice);
      this.scheduleCleanup(voice, SPAWN.DURATION);
    }
  }

  playDeath(type: 'firefly' | 'monster' | 'wisp'): void {
    if (!this.initialized) return;

    switch (type) {
      case 'firefly': return this.playFireflyDeath();
      case 'monster': return this.playMonsterDeath();
      case 'wisp': return this.playWispDeath();
    }
  }

  private playFireflyDeath(): void {
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(DEATH.FIREFLY_START_FREQ, now);
    osc.frequency.exponentialRampToValueAtTime(DEATH.FIREFLY_START_FREQ * DEATH.FIREFLY_PITCH_DROP, now + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(DEATH.FIREFLY_VELOCITY, now);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + 0.5);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = DEATH.FIREFLY_REVERB;

    osc.connect(gain);
    gain.connect(this.sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    osc.start(now);
    osc.stop(now + 0.55);

    const voice: VoiceNode = { source: osc, nodes: [osc, gain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, 0.55);
  }

  private playMonsterDeath(): void {
    const now = this.ctx.currentTime + LOOKAHEAD;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(DEATH.MONSTER_NOISE_DURATION);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = DEATH.MONSTER_LOWPASS;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(DEATH.MONSTER_VELOCITY, now);
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + DEATH.MONSTER_NOISE_DURATION);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = DEATH.MONSTER_REVERB;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    noise.start(now);

    const voice: VoiceNode = { source: noise, nodes: [noise, filter, gain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, 0.3);
  }

  private playWispDeath(): void {
    const now = this.ctx.currentTime + LOOKAHEAD;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = DEATH.WISP_NOTE_1;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = DEATH.WISP_NOTE_2;

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(DEATH.WISP_VELOCITY, now);
    gain1.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + 0.8);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(DEATH.WISP_VELOCITY, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + 1.0);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = DEATH.WISP_REVERB;

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.sfxGain);
    gain2.connect(this.sfxGain);
    gain1.connect(reverbGain);
    gain2.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1);
    osc2.stop(now + 1.1);

    const voice: VoiceNode = { source: osc1, nodes: [osc1, osc2, gain1, gain2, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, 1.1);
  }

  playConstruction(bright = false, velocity = CONSTRUCTION.DEFAULT_VELOCITY): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(CONSTRUCTION.NOISE_DECAY);

    const filterFreq = bright ? CONSTRUCTION.BANDPASS_BRIGHT : CONSTRUCTION.BANDPASS_NORMAL;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = CONSTRUCTION.BANDPASS_Q;

    const toneFreq = bright ? CONSTRUCTION.TONE_FREQ_BRIGHT : CONSTRUCTION.TONE_FREQ_NORMAL;
    const tone = this.ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = toneFreq;

    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(velocity * 0.5, now);
    toneGain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + CONSTRUCTION.TONE_DECAY);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity, now);
    noiseGain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + CONSTRUCTION.NOISE_DECAY);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = bright ? CONSTRUCTION.REVERB_BRIGHT : CONSTRUCTION.REVERB_NORMAL;

    noise.connect(filter);
    filter.connect(noiseGain);
    tone.connect(toneGain);
    noiseGain.connect(this.sfxGain);
    toneGain.connect(this.sfxGain);
    noiseGain.connect(reverbGain);
    toneGain.connect(reverbGain);
    reverbGain.connect(this.reverbSend);

    noise.start(now);
    tone.start(now);
    tone.stop(now + CONSTRUCTION.DURATION);

    const voice: VoiceNode = { source: tone, nodes: [noise, filter, noiseGain, tone, toneGain, reverbGain] };
    this.addVoice(voice);
    this.scheduleCleanup(voice, CONSTRUCTION.DURATION);
  }

  playBreak(): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;

    const allNodes: AudioNode[] = [];

    const masterBurstGain = this.ctx.createGain();
    masterBurstGain.gain.value = 1;
    masterBurstGain.connect(this.sfxGain);

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = BREAK.REVERB_SEND;
    reverbGain.connect(this.reverbSend);
    masterBurstGain.connect(reverbGain);

    allNodes.push(masterBurstGain, reverbGain);

    for (let i = 0; i < BREAK.BAND_FREQS.length; i++) {
      const offset = i * BREAK.BURST_STAGGER;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(BREAK.BURST_DURATION);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = BREAK.BAND_FREQS[i];
      filter.Q.value = BREAK.BAND_Q;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(BREAK.BURST_VELOCITY, now + offset);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + offset + BREAK.BURST_DURATION);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterBurstGain);

      noise.start(now + offset);
      allNodes.push(noise, filter, gain);
    }

    const lowOsc = this.ctx.createOscillator();
    lowOsc.type = 'sine';
    lowOsc.frequency.setValueAtTime(BREAK.LOW_START_FREQ, now);
    lowOsc.frequency.exponentialRampToValueAtTime(BREAK.LOW_END_FREQ, now + BREAK.LOW_DROP_TIME);

    const lowGain = this.ctx.createGain();
    lowGain.gain.setValueAtTime(BREAK.LOW_VELOCITY, now);
    lowGain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + BREAK.LOW_DECAY);

    lowOsc.connect(lowGain);
    lowGain.connect(masterBurstGain);

    lowOsc.start(now);
    lowOsc.stop(now + 0.3);

    allNodes.push(lowOsc, lowGain);

    const voice: VoiceNode = { source: lowOsc, nodes: allNodes };
    this.addVoice(voice);
    this.scheduleCleanup(voice, BREAK.DURATION);
  }

  playMotif(notes: number[], spacing = MOTIF.DEFAULT_SPACING, velocity = MOTIF.DEFAULT_VELOCITY, reverbAmount = MOTIF.DEFAULT_REVERB): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;
    const allNodes: AudioNode[] = [];
    let firstOsc: OscillatorNode | null = null;
    const totalDuration = (notes.length - 1) * spacing + MOTIF.LAST_NOTE_RELEASE;

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = reverbAmount;
    reverbGain.connect(this.reverbSend);
    allNodes.push(reverbGain);

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * spacing;
      const isLast = i === notes.length - 1;
      const release = isLast ? MOTIF.LAST_NOTE_RELEASE : MOTIF.NOTE_RELEASE;

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      if (!firstOsc) firstOsc = osc;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(velocity, t + MOTIF.NOTE_ATTACK);
      gain.gain.setValueAtTime(velocity, t + MOTIF.NOTE_SUSTAIN);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, t + release);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      gain.connect(reverbGain);

      osc.start(t);
      osc.stop(t + release + 0.05);
      allNodes.push(osc, gain);
    }

    const voice: VoiceNode = { source: firstOsc!, nodes: allNodes };
    this.addVoice(voice);
    this.scheduleCleanup(voice, totalDuration);
  }

  playDefeatMotif(notes: number[]): void {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + LOOKAHEAD;
    const allNodes: AudioNode[] = [];
    let firstOsc: OscillatorNode | null = null;

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = DEFEAT_MOTIF.REVERB_SEND;
    reverbGain.connect(this.reverbSend);
    allNodes.push(reverbGain);

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * DEFEAT_MOTIF.SPACING;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = notes[i] * Math.pow(2, DEFEAT_MOTIF.DETUNE_CENTS / 1200);
      if (!firstOsc) firstOsc = osc;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = DEFEAT_MOTIF.LOWPASS_FREQ;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(DEFEAT_MOTIF.VELOCITY, t + DEFEAT_MOTIF.ATTACK);
      gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, t + DEFEAT_MOTIF.RELEASE);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      gain.connect(reverbGain);

      osc.start(t);
      osc.stop(t + DEFEAT_MOTIF.RELEASE + 0.2);
      allNodes.push(osc, filter, gain);
    }

    const voice: VoiceNode = { source: firstOsc!, nodes: allNodes };
    this.addVoice(voice);
    this.scheduleCleanup(voice, notes.length * DEFEAT_MOTIF.SPACING + DEFEAT_MOTIF.RELEASE + 0.2);
  }

  // ─── Drone system ────────────────────────────────────────────────────────

  startDrone(fadeTime = DRONE.FADE_IN): void {
    if (!this.initialized || this.droneActive) return;
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
    osc3.frequency.value = DRONE_FREQUENCIES.C2 * 2; // C3

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

    if (fadeTime > 0) {
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, fadeTime / 3);
      setTimeout(() => this.cleanupDrone(), fadeTime * 1000 + 100);
    } else {
      this.droneGain.gain.value = 0;
      this.cleanupDrone();
    }

    this.stopTension(0);
  }

  private cleanupDrone(): void {
    for (const osc of [...this.droneOscillators, ...this.droneLFOs]) {
      try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
    }
    for (const node of this.droneNodes) {
      try { node.disconnect(); } catch { /* ok */ }
    }
    this.droneOscillators = [];
    this.droneLFOs = [];
    this.droneNodes = [];
  }

  setDroneIntensity(intensity: number): void {
    if (!this.droneActive || !this.initialized) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const volume = DRONE.INTENSITY_MIN_VOLUME + clamped * DRONE.INTENSITY_MAX_VOLUME;
    this.droneGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.7);
  }

  setTensionLevel(level: number): void {
    if (!this.initialized) return;
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

    if (fadeTime > 0) {
      this.tensionGain.gain.setTargetAtTime(0, this.ctx.currentTime, fadeTime / 3);
      const oscs = this.tensionOscillators;
      const tg = this.tensionGain;
      setTimeout(() => {
        for (const osc of oscs) {
          try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
        }
        try { tg.disconnect(); } catch { /* ok */ }
      }, fadeTime * 1000 + 100);
    } else {
      for (const osc of this.tensionOscillators) {
        try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
      }
      try { this.tensionGain.disconnect(); } catch { /* ok */ }
    }

    this.tensionOscillators = [];
    this.tensionGain = null;
    this.lastTensionTarget = -1;
  }

  update(_delta: number): void {
    // Drone evolution is handled via setDroneIntensity/setTensionLevel calls from SoundSystem
  }
}
