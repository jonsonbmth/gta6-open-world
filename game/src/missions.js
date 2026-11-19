// The seven story jobs: a stage machine with GPS targets, dialogue, and the
// wanted/escape rules. A 'wanted' stage latches: it does not auto-complete when
// the stars drop to 0 — the player must finish the stage's own condition.
import { JOBS } from './config.js';

export function createMissions() {
  let jobIndex = 0;
  let stageIndex = 0;
  let dialogueQueue = [];
  let currentDialogue = null;
  let wantedLatched = false;

  function job() {
    return JOBS[Math.min(jobIndex, JOBS.length - 1)];
  }
  function stage() {
    const j = job();
    return j.stages[Math.min(stageIndex, j.stages.length - 1)];
  }
  function isComplete() {
    return jobIndex >= JOBS.length;
  }

  function queueDialogue(lines) {
    dialogueQueue = dialogueQueue.concat(lines);
  }

  function startJob(index) {
    jobIndex = index;
    stageIndex = 0;
    wantedLatched = false;
    const j = job();
    queueDialogue(j.dialogue.slice(0, 1));
  }

  function advanceStage() {
    stageIndex += 1;
    wantedLatched = false;
    const j = job();
    if (stageIndex >= j.stages.length) {
      jobIndex += 1;
      stageIndex = 0;
      if (jobIndex < JOBS.length) {
        queueDialogue(JOBS[jobIndex].dialogue.slice(0, 1));
        return { jobComplete: true, job: JOBS[jobIndex - 1] };
      }
      return { jobComplete: true, gameComplete: true };
    }
    return { jobComplete: false };
  }

  // Called every frame with the live game state; returns events for the HUD.
  function update(state) {
    const events = [];
    const current = stage();
    const target = current.target;
    const dx = state.player.x - target.x;
    const dz = state.player.z - target.z;
    const dist = Math.hypot(dx, dz);
    if (current.type === 'drive' || current.type === 'meet') {
      if (dist < 9) {
        const result = advanceStage();
        events.push({ type: 'stage', result, job: job(), stage: stage() });
      }
    } else if (current.type === 'enter-car') {
      if (state.inCar && dist < 14) {
        const result = advanceStage();
        events.push({ type: 'stage', result, job: job(), stage: stage() });
      } else if (!state.inCar && dist < 6) {
        events.push({ type: 'hint', text: 'Press E to get in the car' });
      }
    } else if (current.type === 'wanted') {
      // Latch: once the heat is on, the stage only completes at the target —
      // dropping to 0 stars does not complete it by itself.
      if (state.wanted >= 3) wantedLatched = true;
      if (wantedLatched && dist < 12) {
        const result = advanceStage();
        events.push({ type: 'stage', result, job: job(), stage: stage() });
      }
    } else if (current.type === 'escape') {
      if (state.wanted === 0 && dist < 14) {
        const result = advanceStage();
        events.push({ type: 'stage', result, job: job(), stage: stage() });
      }
    }
    return events;
  }

  function nextDialogue() {
    if (dialogueQueue.length === 0) return currentDialogue;
    currentDialogue = dialogueQueue.shift();
    return currentDialogue;
  }

  function clearDialogue() {
    dialogueQueue = [];
    currentDialogue = null;
  }

  return {
    get jobIndex() { return jobIndex; },
    get stageIndex() { return stageIndex; },
    get currentDialogue() { return currentDialogue; },
    job,
    stage,
    isComplete,
    startJob,
    update,
    queueDialogue,
    nextDialogue,
    clearDialogue,
    // Resume support: jump straight to a saved job/stage without restarting.
    resume(savedJob, savedStage) {
      jobIndex = Math.max(0, Math.min(savedJob, JOBS.length - 1));
      stageIndex = Math.max(0, Math.min(savedStage, job().stages.length - 1));
      wantedLatched = false;
    },
  };
}
