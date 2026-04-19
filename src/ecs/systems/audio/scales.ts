// C minor pentatonic: C, Eb, F, G, Bb (octave 3 base frequencies)
export const SCALE_FREQUENCIES = [130.81, 155.56, 174.61, 196.0, 233.08];

const SUB_BASS = {
  C1: 32.7,
  G1: 49.0,
  C2: 65.41,
  Eb2: 77.78,
  Bb2: 116.54,
};

export const DRONE_FREQUENCIES = SUB_BASS;

export function randomNote(octaveShift = 0): number {
  const idx = Math.floor(Math.random() * SCALE_FREQUENCIES.length);
  return SCALE_FREQUENCIES[idx] * Math.pow(2, octaveShift);
}

export function randomDetune(): number {
  return (Math.random() * 2 - 1) * 15;
}

export function noteWithDetune(frequency: number): number {
  const cents = randomDetune();
  return frequency * Math.pow(2, cents / 1200);
}

export function motifNotes(pattern: 'victory' | 'defeat' | 'collect'): number[] {
  switch (pattern) {
    case 'victory':
      return [261.63, 311.13, 392.0, 523.25]; // C4, Eb4, G4, C5
    case 'defeat':
      return [233.08, 155.56]; // Bb3, Eb3
    case 'collect':
      return [261.63, 349.23, 392.0]; // C4, F4, G4
  }
}
