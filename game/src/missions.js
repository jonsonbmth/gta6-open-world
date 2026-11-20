// Missions + story: Sunset Sprint (6 checkpoints), wanted level, cash, drift.
// The game is a story in chapters; the sprint is chapter 1.
import { CHECKPOINTS, DIALOGUE } from './config.js';

export function createMissions() {
  const state = {
    chapter: 1,
    chapterTitle: 'First Run',
    objective: 'Drive to the garage on Crown Road',
    next: 'Follow the GPS route to Crown Road',
    checkpointIndex: 0,
    checkpointTotal: CHECKPOINTS.length,
    cash: 42780,
    wanted: 0,
    driftScore: 0,
    bestDrift: 0,
    missionsWon: 0,
    sprintActive: true,
    sprintTime: 180, // 3:00 countdown
    nearMissAt: -10,
    driftAt: -10,
  };
  return {
    state,
    checkpoint() { return CHECKPOINTS[state.checkpointIndex % CHECKPOINTS.length]; },
    reachCheckpoint() {
      state.cash += 500;
      state.checkpointIndex += 1;
      if (state.checkpointIndex >= CHECKPOINTS.length) {
        state.missionsWon += 1;
        state.cash += 2500;
        state.chapter = 2;
        state.chapterTitle = 'Harbour Lights';
        state.objective = 'Meet the contact at the marina';
        state.next = 'Park and get out at the marina';
        state.sprintActive = false;
        return 'won';
      }
      state.objective = `Reach checkpoint ${state.checkpointIndex + 1} of ${CHECKPOINTS.length}`;
      state.next = `Follow the GPS route to ${CHECKPOINTS[state.checkpointIndex].name}`;
      return 'next';
    },
    addDrift(points, t) {
      state.driftScore += points;
      state.bestDrift = Math.max(state.bestDrift, state.driftScore);
      state.driftAt = t;
      return state.driftScore;
    },
    resetDrift() { state.driftScore = 0; },
    addNearMiss(t) {
      state.cash += 250;
      state.nearMissAt = t;
    },
    setWanted(level) { state.wanted = Math.max(0, Math.min(5, level)); },
  };
}
