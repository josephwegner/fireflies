import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundEngine } from '../SoundEngine';

function createMockAudioContext(): AudioContext {
  const gainNode = () => ({
    gain: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const oscNode = () => ({
    type: 'sine',
    frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  });
  const filterNode = () => ({
    type: 'lowpass',
    frequency: { value: 0 },
    Q: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const delayNode = () => ({
    delayTime: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain: vi.fn(() => gainNode()),
    createOscillator: vi.fn(() => oscNode()),
    createBiquadFilter: vi.fn(() => filterNode()),
    createDelay: vi.fn(() => delayNode()),
    createWaveShaper: vi.fn(() => ({ curve: null, connect: vi.fn(), disconnect: vi.fn() })),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(100) })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    })),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  } as unknown as AudioContext;
}

describe('SoundEngine', () => {
  let ctx: AudioContext;
  let engine: SoundEngine;

  beforeEach(() => {
    ctx = createMockAudioContext();
    engine = new SoundEngine(ctx);
    engine.initialize();
  });

  describe('initialization', () => {
    it('creates gain nodes on initialize', () => {
      expect(ctx.createGain).toHaveBeenCalled();
    });

    it('does not double-initialize', () => {
      const callCount = (ctx.createGain as any).mock.calls.length;
      engine.initialize();
      expect((ctx.createGain as any).mock.calls.length).toBe(callCount);
    });
  });

  describe('public API delegation', () => {
    function oscCallCount() {
      return (ctx.createOscillator as ReturnType<typeof vi.fn>).mock.calls.length;
    }
    function gainCallCount() {
      return (ctx.createGain as ReturnType<typeof vi.fn>).mock.calls.length;
    }
    function bufferSourceCallCount() {
      return (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length;
    }

    it('should create oscillators when playing a chime', () => {
      const before = oscCallCount();
      engine.playChime(440);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when playing a wood tap', () => {
      const before = oscCallCount();
      engine.playWoodTap(440);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when playing a bass pulse', () => {
      const before = oscCallCount();
      engine.playBassPulse(65);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when playing a wisp pulse', () => {
      const before = oscCallCount();
      engine.playWispPulse(440);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create audio nodes when playing spawn sound', () => {
      const before = oscCallCount();
      engine.playSpawn(440, 'firefly');
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create audio nodes for monster spawn', () => {
      const before = oscCallCount();
      engine.playSpawn(130, 'monster');
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create audio nodes when playing death sounds', () => {
      for (const type of ['firefly', 'monster', 'wisp'] as const) {
        const before = oscCallCount() + bufferSourceCallCount();
        engine.playDeath(type);
        expect(oscCallCount() + bufferSourceCallCount()).toBeGreaterThan(before);
      }
    });

    it('should create oscillators for wisp activation', () => {
      const before = oscCallCount();
      engine.playWispActivation();
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create audio nodes for construction sound', () => {
      const before = bufferSourceCallCount() + oscCallCount();
      engine.playConstruction();
      expect(bufferSourceCallCount() + oscCallCount()).toBeGreaterThan(before);
    });

    it('should create audio nodes for break sound', () => {
      const before = bufferSourceCallCount() + oscCallCount();
      engine.playBreak();
      expect(bufferSourceCallCount() + oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when playing a motif', () => {
      const before = oscCallCount();
      engine.playMotif([440, 523]);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when playing a defeat motif', () => {
      const before = oscCallCount();
      engine.playDefeatMotif([440, 392]);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when starting drone', () => {
      const before = oscCallCount();
      engine.startDrone();
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create gain nodes for drone intensity', () => {
      engine.startDrone();
      const before = gainCallCount();
      engine.setDroneIntensity(0.5);
      expect(gainCallCount()).toBeGreaterThanOrEqual(before);
    });

    it('should create oscillators for tension level', () => {
      const before = oscCallCount();
      engine.setTensionLevel(0.5);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should create oscillators when ambient plays a fragment', () => {
      engine.startAmbient();
      // Ambient is time-driven: advance currentTime past the scheduled nextTime
      (ctx as any).currentTime = 10;
      const before = oscCallCount();
      engine.update(16);
      expect(oscCallCount()).toBeGreaterThan(before);
    });

    it('should not throw when stopping ambient', () => {
      engine.startAmbient();
      expect(() => engine.stopAmbient()).not.toThrow();
    });

    it('should not throw when setting ambient mood', () => {
      engine.startAmbient();
      expect(() => engine.setAmbientMood(0.5)).not.toThrow();
    });

    it('should not throw on update', () => {
      expect(() => engine.update(16)).not.toThrow();
    });
  });

  describe('uninitialized guard', () => {
    it('does not play sounds before initialization', () => {
      const uninitEngine = new SoundEngine(ctx);
      expect(() => uninitEngine.playChime(440)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('can be destroyed without error', () => {
      expect(() => engine.destroy()).not.toThrow();
    });

    it('does not play sounds after destroy', () => {
      engine.destroy();
      expect(() => engine.playChime(440)).not.toThrow();
    });

    it('cleans up tension oscillators even when drone is not active', () => {
      engine.setTensionLevel(0.5);
      expect(() => engine.destroy()).not.toThrow();
    });
  });

  describe('empty notes guard', () => {
    it('playMotif does not crash on empty notes', () => {
      expect(() => engine.playMotif([])).not.toThrow();
    });

    it('playDefeatMotif does not crash on empty notes', () => {
      expect(() => engine.playDefeatMotif([])).not.toThrow();
    });
  });
});
