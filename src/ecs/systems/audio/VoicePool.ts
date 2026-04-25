export const GAIN_FLOOR = 0.001;
export const LOOKAHEAD = 0.005;

const MAX_VOICES = 32;

export interface VoiceNode {
  source: OscillatorNode | AudioBufferSourceNode;
  nodes: AudioNode[];
}

export interface AudioGraph {
  ctx: AudioContext;
  sfxGain: GainNode;
  reverbSend: GainNode;
  voicePool: VoicePool;
}

export class VoicePool {
  private ctx: AudioContext;
  private activeVoices: Set<VoiceNode> = new Set();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  get size(): number {
    return this.activeVoices.size;
  }

  add(voice: VoiceNode): void {
    if (this.activeVoices.size >= MAX_VOICES) {
      const oldest = this.activeVoices.values().next().value!;
      this.kill(oldest);
    }
    this.activeVoices.add(voice);
  }

  remove(voice: VoiceNode): void {
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* ok */ }
    }
    this.activeVoices.delete(voice);
  }

  scheduleCleanup(voice: VoiceNode): void {
    voice.source.onended = () => this.remove(voice);
  }

  kill(voice: VoiceNode): void {
    this.activeVoices.delete(voice);
    const fadeOut = 0.02;
    const now = this.ctx.currentTime;
    const nodes = voice.nodes;

    for (const node of nodes) {
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
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* already disconnected */ }
      }
    }, fadeOut * 1000 + 5);
  }

  killAll(): void {
    for (const voice of this.activeVoices) {
      this.kill(voice);
    }
    this.activeVoices.clear();
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
}
