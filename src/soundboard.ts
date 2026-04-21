import { SoundEngine } from './ecs/systems/audio/SoundEngine';
import { randomNote, noteWithDetune, motifNotes } from './ecs/systems/audio/scales';

const ctx = new AudioContext();
const engine = new SoundEngine(ctx);
engine.initialize();

const status = document.getElementById('status')!;
status.textContent = `AudioContext: ${ctx.state}`;
ctx.addEventListener('statechange', () => {
  status.textContent = `AudioContext: ${ctx.state}`;
});

const toggleState: Record<string, boolean> = {
  droneToggle: false,
  tensionToggle: false,
  ambientToggle: false,
};

const sounds: Record<string, () => void> = {
  woodTap: () => engine.playWoodTap(noteWithDetune(196.0)),
  bassPulse: () => engine.playBassPulse(noteWithDetune(65.41)),
  wispPulse: () => engine.playWispPulse(randomNote(1)),
  chime: () => engine.playChime(randomNote(1)),
  construction: () => engine.playConstruction(),
  constructionBright: () => engine.playConstruction(true),
  fireflySpawn: () => engine.playSpawn(randomNote(1), 'firefly', 0.06),
  monsterSpawn: () => engine.playSpawn(randomNote(0), 'monster', 0.1),
  fireflyDeath: () => engine.playDeath('firefly'),
  monsterDeath: () => engine.playDeath('monster'),
  wispDeath: () => engine.playDeath('wisp'),
  wispActivation: () => engine.playWispActivation(),
  collect: () => engine.playMotif(motifNotes('collect'), 0.12, 0.1, 0.5),
  victory: () => engine.playMotif(motifNotes('victory'), 0.2, 0.15, 0.8),
  defeat: () => engine.playDefeatMotif(motifNotes('defeat')),
  wallBreak: () => engine.playBreak(),
  droneToggle: () => {
    toggleState.droneToggle = !toggleState.droneToggle;
    if (toggleState.droneToggle) {
      engine.startDrone(1);
    } else {
      engine.stopDrone(1);
    }
  },
  tensionToggle: () => {
    toggleState.tensionToggle = !toggleState.tensionToggle;
    if (toggleState.tensionToggle) {
      engine.setTensionLevel(parseFloat((document.getElementById('tensionLevel') as HTMLInputElement).value));
    } else {
      engine.setTensionLevel(0);
    }
  },
  ambientToggle: () => {
    toggleState.ambientToggle = !toggleState.ambientToggle;
    if (toggleState.ambientToggle) {
      engine.startAmbient();
    } else {
      engine.stopAmbient();
    }
  },
};

document.querySelectorAll<HTMLButtonElement>('button[data-sound]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (ctx.state === 'suspended') ctx.resume();

    const key = btn.dataset.sound!;
    sounds[key]?.();

    if (btn.classList.contains('toggle')) {
      btn.classList.toggle('active', toggleState[key]);
    }
  });
});

function setupSlider(id: string, valId: string, onChange: (v: number) => void) {
  const slider = document.getElementById(id) as HTMLInputElement;
  const display = document.getElementById(valId)!;
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    display.textContent = v.toFixed(2);
    onChange(v);
  });
}

setupSlider('droneIntensity', 'droneIntensityVal', v => {
  if (toggleState.droneToggle) engine.setDroneIntensity(v);
});

setupSlider('tensionLevel', 'tensionLevelVal', v => {
  if (toggleState.tensionToggle) engine.setTensionLevel(v);
});

setupSlider('ambientMood', 'ambientMoodVal', v => {
  engine.setAmbientMood(v);
});

// Drive ambient fragments via the engine's update loop
let lastTime = 0;
function tick(time: number) {
  const delta = lastTime ? time - lastTime : 16;
  lastTime = time;
  engine.update(delta);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
