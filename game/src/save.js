// Save / resume in localStorage. The save records the job and stage the player
// reached, so resuming never restarts a job's stages — the current objective's
// dialogue is shown again on load.
import { SAVE_KEY } from './config.js';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      version: 13,
      money: state.money,
      respect: state.respect,
      job: state.job,
      stage: state.stage,
      wanted: 0,
      player: state.player ? { x: state.player.x, z: state.player.z, heading: state.player.heading } : null,
      inCar: !!state.inCar,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}

// The objective text a resumed game shows first, so the player knows where they are.
export function resumeDialogue(job, stage) {
  if (!job) return null;
  const current = job.stages[Math.min(stage, job.stages.length - 1)];
  return {
    who: job.dialogue[0] ? job.dialogue[0].who : 'Lena "Wrench" Ortiz',
    line: `Back at it — ${current.text}.`,
  };
}
