// Missions and story: 8 jobs for the fixer Vera "The Velvet" Castillo, each
// with stages, a timer, a target, and dialogue. The player progresses by
// reaching objectives; finishing a job pays out and unlocks the next. The
// crew of three (driver, mechanic, lookout) grant abilities on cooldown.

export const CREW = [
  { key: 'Z', name: 'Lena "Luz" Mora', role: 'Driver', ability: 'SWAP PLATES', desc: 'Lose one wanted star', cooldown: 45 },
  { key: 'X', name: 'Hugo "Wrench" Salas', role: 'Mechanic', ability: 'QUICK FIX', desc: 'Repair the car to full', cooldown: 60 },
  { key: 'C', name: 'Nina "Hawk" Duarte', role: 'Lookout', ability: 'EYES OUT', desc: 'Mark all police for 20 s', cooldown: 50 },
];

export const JOBS = [
  {
    id: 1, name: 'FIRST LIGHT', client: 'Vera "The Velvet" Castillo',
    brief: 'A courier van is waiting at Gilded Quay. Take it, lose the tail, bring it to the garage.',
    stages: ['Steal the courier van', 'Lose the police tail', 'Deliver to the Ember Garage'],
    payout: 1200,
  },
  {
    id: 2, name: 'SALT IN THE WOUND', client: 'Vera "The Velvet" Castillo',
    brief: 'The Harbor Boys moved our crates. Get them back from the pier warehouse.',
    stages: ['Reach the pier warehouse', 'Take the crates', 'Return to the safehouse'],
    payout: 1800,
  },
  {
    id: 3, name: 'GOLDEN GECKO', client: 'Tomas Reyes',
    brief: 'A gold-painted coupe is parked at Vidrio Dunes. It belongs to us now.',
    stages: ['Find the golden coupe', 'Steal it without a scratch', 'Park it at the showroom'],
    payout: 2400,
  },
  {
    id: 4, name: 'MARKET SQUEEZE', client: 'Vera "The Velvet" Castillo',
    brief: 'The Kerono Boys run the night market stalls. Clear them out, quietly.',
    stages: ['Enter Coral Market', 'Clear the Kerono Boys (5)', 'Melt away'],
    payout: 3000,
  },
  {
    id: 5, name: 'HIGH TIDE', client: 'Tia Rosa',
    brief: 'Sterling Vasko is making a run for it at the marina. Stop him.',
    stages: ['Reach the marina', 'Stop Vasko\u2019s guards (6)', 'Take Vasko alive'],
    payout: 4200,
  },
  {
    id: 6, name: 'ORU\u2019S FALL', client: 'Mira Kesang',
    brief: 'Oru\u2019s Regent is heading for Kumala Pier. Wreck it before it reaches the water.',
    stages: ['Chase the Regent', 'Wreck the Regent', 'Vanish'],
    payout: 5500,
  },
  {
    id: 7, name: 'THE LONG WAY HOME', client: 'Vera "The Velvet" Castillo',
    brief: 'A convoy crosses Ember Heights at dusk. Hit the middle truck and get out.',
    stages: ['Find the convoy', 'Hit the middle truck', 'Lose the heat'],
    payout: 6800,
  },
  {
    id: 8, name: 'THE EMBER RUN', client: 'Vera "The Velvet" Castillo',
    brief: 'Six guns and a chopper, Dante — lose the lights or lose the car. Shake the ABPD, then reach the garage.',
    stages: ['Shake the first cruisers', 'Lose the helicopter', 'Reach the Ember Garage', 'Deliver the ledger'],
    payout: 9000,
  },
];

export const DIALOGUE = [
  { from: 'VERA · FIXER', text: 'Six guns and a chopper, Dante — lose the lights or lose the car.' },
  { from: 'VERA · FIXER', text: 'The garage door is open. Do not bring the whole city with you.' },
  { from: 'LENA · DRIVER', text: 'Plates swapped. They are looking for a ghost now.' },
  { from: 'HUGO · MECHANIC', text: 'Engine sounds sweet again. Try not to bend it this time.' },
  { from: 'NINA · LOOKOUT', text: 'Two cruisers on Sunset Mile, one on the bridge. Eyes up.' },
  { from: 'VERA · FIXER', text: 'The ledger is worth more than the car. Get it home.' },
];

export function createMissions() {
  const state = {
    jobIndex: 7, // The Ember Run is the active job (8/8).
    stageIndex: 1, // "Lose the helicopter" — the chase is on.
    timer: 191, // 03:11 on the clock.
    money: 27850,
    rep: 2310,
    repLevel: 6,
    completed: 7,
    crewCooldowns: { Z: 0, X: 0, C: 0 },
    dialogueIndex: 0,
  };
  return {
    state,
    currentJob() {
      return JOBS[state.jobIndex];
    },
    currentStage() {
      const job = JOBS[state.jobIndex];
      return job.stages[state.stageIndex];
    },
    advanceStage() {
      const job = JOBS[state.jobIndex];
      if (state.stageIndex < job.stages.length - 1) {
        state.stageIndex += 1;
      } else {
        state.money += job.payout;
        state.completed += 1;
        state.rep += 240;
        if (state.jobIndex < JOBS.length - 1) {
          state.jobIndex += 1;
          state.stageIndex = 0;
          state.timer = 300;
        }
      }
    },
    nextDialogue() {
      const line = DIALOGUE[state.dialogueIndex % DIALOGUE.length];
      state.dialogueIndex += 1;
      return line;
    },
    useAbility(key) {
      if (state.crewCooldowns[key] > 0) return null;
      const crew = CREW.find((c) => c.key === key);
      if (!crew) return null;
      state.crewCooldowns[key] = crew.cooldown;
      return crew;
    },
    update(dt) {
      state.timer = Math.max(0, state.timer - dt);
      for (const key of Object.keys(state.crewCooldowns)) {
        state.crewCooldowns[key] = Math.max(0, state.crewCooldowns[key] - dt);
      }
    },
  };
}
