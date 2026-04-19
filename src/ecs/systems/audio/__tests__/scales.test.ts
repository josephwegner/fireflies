import { describe, it, expect } from 'vitest';
import {
  SCALE_FREQUENCIES,
  randomNote,
  randomDetune,
  motifNotes,
  noteWithDetune,
} from '../scales';

describe('scales', () => {
  describe('SCALE_FREQUENCIES', () => {
    it('contains 5 notes per octave', () => {
      expect(SCALE_FREQUENCIES.length).toBe(5);
    });

    it('contains C minor pentatonic frequencies', () => {
      expect(SCALE_FREQUENCIES[0]).toBeCloseTo(130.81, 1);
      expect(SCALE_FREQUENCIES[1]).toBeCloseTo(155.56, 1);
      expect(SCALE_FREQUENCIES[2]).toBeCloseTo(174.61, 1);
      expect(SCALE_FREQUENCIES[3]).toBeCloseTo(196.00, 1);
      expect(SCALE_FREQUENCIES[4]).toBeCloseTo(233.08, 1);
    });
  });

  describe('randomNote', () => {
    it('returns a frequency from the scale at octave 0', () => {
      for (let i = 0; i < 50; i++) {
        const note = randomNote(0);
        expect(SCALE_FREQUENCIES).toContainEqual(expect.closeTo(note, 1));
      }
    });

    it('returns doubled frequency at octave +1', () => {
      for (let i = 0; i < 50; i++) {
        const note = randomNote(1);
        const halfNote = note / 2;
        const matchesScale = SCALE_FREQUENCIES.some(
          f => Math.abs(f - halfNote) < 0.1
        );
        expect(matchesScale).toBe(true);
      }
    });

    it('returns halved frequency at octave -1', () => {
      for (let i = 0; i < 50; i++) {
        const note = randomNote(-1);
        const doubledNote = note * 2;
        const matchesScale = SCALE_FREQUENCIES.some(
          f => Math.abs(f - doubledNote) < 0.1
        );
        expect(matchesScale).toBe(true);
      }
    });
  });

  describe('randomDetune', () => {
    it('returns values within ±15 cents', () => {
      for (let i = 0; i < 100; i++) {
        const detune = randomDetune();
        expect(detune).toBeGreaterThanOrEqual(-15);
        expect(detune).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('noteWithDetune', () => {
    it('returns a frequency close to the input', () => {
      const base = 261.63;
      for (let i = 0; i < 50; i++) {
        const result = noteWithDetune(base);
        const ratio = result / base;
        const cents = 1200 * Math.log2(ratio);
        expect(Math.abs(cents)).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('motifNotes', () => {
    it('returns ascending notes for victory', () => {
      const notes = motifNotes('victory');
      expect(notes.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i]).toBeGreaterThan(notes[i - 1]);
      }
    });

    it('returns descending notes for defeat', () => {
      const notes = motifNotes('defeat');
      expect(notes.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i]).toBeLessThan(notes[i - 1]);
      }
    });

    it('returns ascending notes for collect', () => {
      const notes = motifNotes('collect');
      expect(notes.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i]).toBeGreaterThan(notes[i - 1]);
      }
    });
  });
});
