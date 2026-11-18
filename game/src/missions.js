// Story: 7 jobs for Rico Marín and his crew. Each job has stages with a
// target spot, dialogue from the crew, and a money + REP payout.
import { S, CITY } from './state.js';

export const CREW = {
  lena: { name: 'LENA "WRENCH" ORTIZ', short: 'LENA' },
  rosa: { name: 'MAMA ROSA', short: 'ROSA' },
  dario: { name: 'DARIO "FUZE" KANE', short: 'DARIO' },
  rico: { name: 'RICO MARÍN', short: 'RICO' },
  cop: { name: 'SBPD DISPATCH', short: 'DISPATCH' },
};

export const JOBS = [
  {
    chapter: 'CH 1', title: 'THE GETAWAY DRIVER',
    desc: 'Lena needs the Comet out of the impound lot.\nGet it back to the garage in one piece.',
    stages: [
      { text: 'Reach the impound lot', spot: { x: 120, z: -40, r: 12 }, say: ['lena', 'The Comet is sitting in Lot 4, Rico. Cops towed it at dawn. Go get my car.'] },
      { text: 'Steal the Comet', spot: { x: 120, z: -40, r: 8 }, say: ['rosa', 'Quick hands, mijo. The lot guard changes shift in ten minutes.'], needCar: true },
      { text: 'Lose the cops', spot: null, say: ['cop', 'All units: stolen vehicle heading west on Lumen. Intercept.'], loseCops: true },
      { text: 'Bring it to the garage', spot: { x: CITY.garage.x, z: CITY.garage.z, r: 10 }, say: ['lena', 'That is my girl. Park her inside and I will make her sing.'] },
    ],
    pay: 1200, rep: 120,
  },
  {
    chapter: 'CH 1', title: 'WET WORK',
    desc: 'Dario wired a job at the Old Harbour.\nPick up the package — no questions.',
    stages: [
      { text: 'Meet Dario at the marina', spot: { x: -20, z: 258, r: 12 }, say: ['dario', 'Package is in the blue container, Pier 9. Do not open it. Seriously.'] },
      { text: 'Grab the package', spot: { x: -20, z: 258, r: 6 }, say: ['rico', 'Feels like it ticks. Dario, tell me it does not tick.'] },
      { text: 'Deliver to Mama Rosa', spot: { x: 44, z: -148, r: 10 }, say: ['rosa', 'Bring it to the back room. And Rico — wash your hands. Rain or no rain.'] },
    ],
    pay: 1800, rep: 150,
  },
  {
    chapter: 'CH 2', title: 'NEON RUN',
    desc: 'A rival crew is moving product down Lumen Avenue.\nFollow them. Find the stash house.',
    stages: [
      { text: 'Tail the black sedan', spot: { x: 0, z: -120, r: 18 }, say: ['lena', 'Black Meridian, no plates. Stay two cars back or they will spook.'] },
      { text: 'Follow to the stash house', spot: { x: 95, z: 150, r: 14 }, say: ['dario', 'Eastside warehouse. I knew it. They always use Eastside.'] },
      { text: 'Photograph the drop', spot: { x: 95, z: 150, r: 8 }, say: ['rico', 'Got it. Three crates, two guards. Rosa will love this.'] },
      { text: 'Escape the area', spot: { x: -52, z: 96, r: 12 }, say: ['cop', 'Shots reported near the Eastside warehouse. All units respond.'] },
    ],
    pay: 2500, rep: 200,
  },
  {
    chapter: 'CH 2', title: 'THE COLLECTOR',
    desc: 'A debtor in Downtown owes Rosa forty grand.\nCollect it — politely, then firmly.',
    stages: [
      { text: 'Reach the Downtown tower', spot: { x: -95, z: -260, r: 12 }, say: ['rosa', 'He hides in the glass tower. Remind him who lent him the money.'] },
      { text: 'Confront the debtor', spot: { x: -95, z: -260, r: 6 }, say: ['rico', 'Rosa sends her regards. The envelope, please.'] },
      { text: 'Take the money to Rosa', spot: { x: 44, z: -148, r: 10 }, say: ['dario', 'Forty grand in a wet envelope. Classic.'] },
    ],
    pay: 3200, rep: 220,
  },
  {
    chapter: 'CH 3', title: 'RAIN CHECK',
    desc: 'The crew needs a clean car for the big night.\nSteal a Vulpine S from the Westside showroom.',
    stages: [
      { text: 'Reach the showroom', spot: { x: -160, z: -50, r: 12 }, say: ['lena', 'Red Vulpine S, showroom floor. Alarm is on a 30-second delay. Be quick.'] },
      { text: 'Steal the Vulpine S', spot: { x: -160, z: -50, r: 8 }, say: ['rico', 'She is beautiful. She is also very loud.'], needCar: true },
      { text: 'Outrun the police', spot: null, say: ['cop', 'Grand theft auto in progress, Westside. All units, intercept the red sports car.'], loseCops: true },
      { text: 'Stash it at the safehouse', spot: { x: 44, z: -148, r: 10 }, say: ['lena', 'Park it under the tarp. Tomorrow we paint her midnight blue.'] },
    ],
    pay: 4000, rep: 280,
  },
  {
    chapter: 'CH 3', title: 'FLOOD TIDE',
    desc: 'A storm surge is coming. The crew moves the stash\nfrom the marina before the water takes it.',
    stages: [
      { text: 'Reach the marina stash', spot: { x: 60, z: 258, r: 12 }, say: ['rosa', 'The water rises at midnight. My goods do not swim, Rico.'] },
      { text: 'Load the crates', spot: { x: 60, z: 258, r: 6 }, say: ['dario', 'Four crates. Heavy. Whatever is inside, do not drop it.'] },
      { text: 'Drive to the garage', spot: { x: CITY.garage.x, z: CITY.garage.z, r: 10 }, say: ['lena', 'Garage is dry and the door locks. Move, the rain is getting worse.'] },
    ],
    pay: 5000, rep: 320,
  },
  {
    chapter: 'CH 4', title: 'THE LONG NIGHT',
    desc: 'The rival crew found the garage. Defend it,\nthen finish the job at the Old Harbour.',
    stages: [
      { text: 'Defend the garage', spot: { x: CITY.garage.x, z: CITY.garage.z, r: 14 }, say: ['lena', 'They are here! Rico, get to the garage NOW.'], combat: true },
      { text: 'Chase the last car', spot: { x: 0, z: 200, r: 20 }, say: ['dario', 'One left, heading for the marina. End this.'], needCar: true },
      { text: 'Finish it at the harbour', spot: { x: 0, z: 258, r: 12 }, say: ['rosa', 'When it is done, come home. The rain will wash the rest away.'] },
      { text: 'Return to the safehouse', spot: { x: 44, z: -148, r: 10 }, say: ['rico', 'Solmar Bay. My city. My storm.'] },
    ],
    pay: 8000, rep: 500,
  },
];

export function currentJob() { return JOBS[Math.min(S.mission, JOBS.length - 1)]; }
export function currentStage() { const j = currentJob(); return j.stages[Math.min(S.stage, j.stages.length - 1)]; }
export function jobDone() { return S.mission >= JOBS.length; }

// Advance the mission when the player reaches the stage spot (or its condition).
// Returns an event for the HUD: {type:'say'|'stage'|'jobDone'|'allDone', ...}
export function updateMission(px, pz, inCar) {
  if (jobDone()) return null;
  const job = currentJob();
  const st = job.stages[S.stage];
  if (!st) return null;
  if (st.loseCops) {
    if (S.wanted === 0) return advance();
    return null;
  }
  if (st.spot) {
    const d2 = (px - st.spot.x) ** 2 + (pz - st.spot.z) ** 2;
    if (d2 < st.spot.r * st.spot.r) {
      if (st.needCar && !inCar) return { type: 'hint', text: 'You need a car for this.' };
      return advance();
    }
  }
  return null;
}

function advance() {
  const job = currentJob();
  S.stage++;
  if (S.stage >= job.stages.length) {
    S.money += job.pay;
    S.rep += job.rep;
    S.respect = 1 + Math.floor(S.rep / 250);
    S.mission++;
    S.stage = 0;
    if (S.mission >= JOBS.length) return { type: 'allDone', pay: job.pay };
    return { type: 'jobDone', pay: job.pay, next: JOBS[S.mission].title };
  }
  const next = job.stages[S.stage];
  return { type: 'stage', say: next.say || null, text: next.text };
}

export function stageSay() {
  const st = currentStage();
  return st && st.say ? st.say : null;
}
