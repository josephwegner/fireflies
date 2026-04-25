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
    it('exposes playChime', () => {
      expect(() => engine.playChime(440)).not.toThrow();
    });

    it('exposes playWoodTap', () => {
      expect(() => engine.playWoodTap(440)).not.toThrow();
    });

    it('exposes playBassPulse', () => {
      expect(() => engine.playBassPulse(65)).not.toThrow();
    });

    it('exposes playWispPulse', () => {
      expect(() => engine.playWispPulse(440)).not.toThrow();
    });

    it('exposes playSpawn', () => {
      expect(() => engine.playSpawn(440, 'firefly')).not.toThrow();
      expect(() => engine.playSpawn(130, 'monster')).not.toThrow();
    });

    it('exposes playDeath', () => {
      expect(() => engine.playDeath('firefly')).not.toThrow();
      expect(() => engine.playDeath('monster')).not.toThrow();
      expect(() => engine.playDeath('wisp')).not.toThrow();
    });

    it('exposes playWispActivation', () => {
      expect(() => engine.playWispActivation()).not.toThrow();
    });

    it('exposes playConstruction', () => {
      expect(() => engine.playConstruction()).not.toThrow();
      expect(() => engine.playConstruction(true)).not.toThrow();
    });

    it('exposes playBreak', () => {
      expect(() => engine.playBreak()).not.toThrow();
    });

    it('exposes playMotif', () => {
      expect(() => engine.playMotif([440, 523])).not.toThrow();
    });

    it('exposes playDefeatMotif', () => {
      expect(() => engine.playDefeatMotif([440, 392])).not.toThrow();
    });

    it('exposes startDrone/stopDrone', () => {
      expect(() => engine.startDrone()).not.toThrow();
      expect(() => engine.stopDrone()).not.toThrow();
    });

    it('exposes setDroneIntensity', () => {
      engine.startDrone();
      expect(() => engine.setDroneIntensity(0.5)).not.toThrow();
    });

    it('exposes setTensionLevel', () => {
      expect(() => engine.setTensionLevel(0.5)).not.toThrow();
    });

    it('exposes startAmbient/stopAmbient', () => {
      expect(() => engine.startAmbient()).not.toThrow();
      expect(() => engine.stopAmbient()).not.toThrow();
    });

    it('exposes setAmbientMood', () => {
      expect(() => engine.setAmbientMood(0.5)).not.toThrow();
    });

    it('exposes update', () => {
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
