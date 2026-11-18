// SOLMAR BAY — 7 story jobs. Each job has a giver, dialogue lines and
// stages: reach a marker, lose the cops, hold a spot, or survive a timer.
// Markers are glowing beacons in the world + blips on the minimap and map.
import * as THREE from 'three';
import { CREW } from './config.js';

export const JOBS = [
  {
    id: 'rain-check', chapter: 'CH 1', title: 'RAIN CHECK', giver: 'lena',
    briefing: [
      "Lena: Rico! The VULPINE's finally out of the shop. Take her for a spin down Lumen — and don't scratch her.",
      'Lena: Cops are all over the Strip tonight. Show me you can lose a tail, then bring her home to the garage.',
    ],
    reward: 1200,
    stages: [
      { kind: 'reach', text: 'Drive the VULPINE S down Lumen Avenue', target: { x: 0, z: -120 }, radius: 14 },
      { kind: 'wanted', text: 'Lose the cops — break line of sight', target: null },
      { kind: 'reach', text: 'Return to the Midnight Garage', target: { x: 20, z: 96 }, radius: 12 },
    ],
  },
  {
    id: 'wet-work', chapter: 'CH 2', title: 'WET WORK', giver: 'dario',
    briefing: [
      "Dario: Package is waiting at Pier 9, under the blue container. Grab it on foot — nobody sees you in this rain.",
      'Dario: Then drop it at the Sueno Motel. Easy money. Just... try not to collect stars on the way.',
    ],
    reward: 1800,
    stages: [
      { kind: 'reach', text: 'Reach Pier 9 and grab the package (on foot)', target: { x: -214, z: 150 }, radius: 10, onFoot: true },
      { kind: 'reach', text: 'Deliver the package to the Sueno Motel', target: { x: -20, z: 61 }, radius: 12 },
    ],
  },
  {
    id: 'mamas-call', chapter: 'CH 3', title: "MAMA'S CALL", giver: 'rosa',
    briefing: [
      "Mama Rosa: Three shops on the Strip owe me this week. La Luna, Tide & Taco, El Faro. Go collect, mijo.",
      "Mama Rosa: Be polite. Be firm. And if the police ask — you're just buying dinner.",
    ],
    reward: 2400,
    stages: [
      { kind: 'reach', text: 'Collect from La Luna', target: { x: -20, z: -130 }, radius: 12 },
      { kind: 'reach', text: 'Collect from Tide & Taco', target: { x: 20, z: -95 }, radius: 12 },
      { kind: 'reach', text: 'Collect from El Faro', target: { x: -20, z: -43 }, radius: 12 },
      { kind: 'reach', text: 'Bring the money back to Mama Rosa', target: { x: -48, z: -120 }, radius: 12 },
    ],
  },
  {
    id: 'ghost-ride', chapter: 'CH 4', title: 'GHOST RIDE', giver: 'lena',
    briefing: [
      "Lena: The ring highway at night, two checkpoints, one timer. Beat 90 seconds and the whole Strip knows your name.",
      'Lena: The VULPINE eats corners for breakfast. Show them.',
    ],
    reward: 3200,
    stages: [
      { kind: 'reach', text: 'Checkpoint 1 — north gate of the ring', target: { x: 0, z: -278 }, radius: 16, timed: 45 },
      { kind: 'reach', text: 'Checkpoint 2 — east gate, beat the clock', target: { x: 278, z: 0 }, radius: 16, timed: 45 },
      { kind: 'reach', text: 'Finish — back to Lumen Avenue', target: { x: 0, z: 0 }, radius: 14 },
    ],
  },
  {
    id: 'high-tide', chapter: 'CH 5', title: 'HIGH TIDE', giver: 'dario',
    briefing: [
      'Dario: The boat boys at the marina are moving something tonight. I need eyes — and a fast car — at the Old Harbour.',
      "Dario: Get the ledger from the dock office, then vanish before the harbour patrol wakes up.",
    ],
    reward: 4200,
    stages: [
      { kind: 'reach', text: 'Reach the Old Harbour dock office', target: { x: -160, z: 190 }, radius: 12 },
      { kind: 'hold', text: 'Hold position — copy the ledger (15s)', target: { x: -160, z: 190 }, radius: 14, holdSeconds: 15 },
      { kind: 'wanted', text: 'Lose the harbour patrol', target: null },
    ],
  },
  {
    id: 'neon-heist', chapter: 'CH 6', title: 'NEON HEIST', giver: 'rosa',
    briefing: [
      'Mama Rosa: The Meridian keeps its weekend take in a safe behind the lobby. The rain is our cover, Rico.',
      "Mama Rosa: Lena cracks it, you drive. Three minutes in and out — then the whole city will be looking for us.",
    ],
    reward: 6500,
    stages: [
      { kind: 'reach', text: 'Reach The Meridian hotel', target: { x: -48, z: -120 }, radius: 12 },
      { kind: 'hold', text: 'Hold the lobby — Lena cracks the safe (20s)', target: { x: -48, z: -120 }, radius: 14, holdSeconds: 20 },
      { kind: 'reach', text: 'Escape to the Coral Docks hideout', target: { x: 180, z: 160 }, radius: 14 },
    ],
  },
  {
    id: 'storm-surge', chapter: 'CH 7', title: 'STORM SURGE', giver: 'rico',
    briefing: [
      "Rico: Five stars, the whole city, one bridge. We cross to Pelican Isle tonight — or we don't cross at all.",
      "Rico: Lena, Dario, Mama — see you on the other side of the water.",
    ],
    reward: 12000,
    stages: [
      { kind: 'reach', text: 'Fight through to Solmar Bridge', target: { x: -200, z: -40 }, radius: 12 },
      { kind: 'reach', text: 'Cross the bridge to Pelican Isle', target: { x: -276, z: -40 }, radius: 14 },
      { kind: 'hold', text: 'Hold the isle until the storm passes (20s)', target: { x: -276, z: -40 }, radius: 16, holdSeconds: 20 },
    ],
  },
];

/** Mission state machine + world markers. */
export function createMissions(scene) {
  let jobIndex = 0;
  let stageIndex = 0;
  let holdTime = 0;
  let stageTimer = 0;
  let stageSawWanted = false;
  let dialogueQueue = [];
  let currentDialogue = null;
  let completedJobs = 0;

  // World marker: glowing beacon cylinder + ring at the objective.
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd60a, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  beam.position.y = 9;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 4.4, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffd60a, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  marker.add(beam, ring);
  marker.visible = false;
  scene.add(marker);

  function job() { return JOBS[Math.min(jobIndex, JOBS.length - 1)]; }
  function stage() { return job().stages[Math.min(stageIndex, job().stages.length - 1)]; }
  function isDone() { return jobIndex >= JOBS.length; }

  function startJob(index) {
    jobIndex = index;
    stageIndex = 0;
    holdTime = 0;
    stageTimer = 0;
    stageSawWanted = false;
    const j = job();
    dialogueQueue = [...j.briefing];
    nextDialogue();
    placeMarker();
  }

  function placeMarker() {
    const s = stage();
    if (s && s.target) {
      marker.position.set(s.target.x, 0, s.target.z);
      marker.visible = true;
    } else {
      marker.visible = false;
    }
  }

  function nextDialogue() {
    currentDialogue = dialogueQueue.length > 0 ? dialogueQueue.shift() : null;
    return currentDialogue;
  }

  function advanceStage() {
    stageIndex += 1;
    holdTime = 0;
    stageTimer = 0;
    stageSawWanted = false;
    if (stageIndex >= job().stages.length) {
      completedJobs += 1;
      return { jobComplete: true, reward: job().reward };
    }
    placeMarker();
    return { stageComplete: true };
  }

  /**
   * Per-frame objective check. Returns an event object or null.
   * ctx: { playerPos, wanted, onFoot, dt }
   */
  function update(ctx) {
    if (isDone()) return null;
    const s = stage();
    if (s.kind === 'reach') {
      const d = Math.hypot(ctx.playerPos.x - s.target.x, ctx.playerPos.z - s.target.z);
      if (d < s.radius) {
        if (s.onFoot && !ctx.onFoot) return { hint: 'Get out of the car (E) to grab it' };
        return advanceStage();
      }
      if (s.timed) {
        stageTimer += ctx.dt;
        if (stageTimer > s.timed) {
          stageTimer = 0;
          return { failed: 'Out of time — checkpoint missed' };
        }
      }
    } else if (s.kind === 'wanted') {
      // Only counts once the heat has actually been on: reaching this
      // stage with zero stars must not complete it for free.
      if (ctx.wanted > 0) stageSawWanted = true;
      if (stageSawWanted && ctx.wanted === 0) return advanceStage();
    } else if (s.kind === 'hold') {
      const d = Math.hypot(ctx.playerPos.x - s.target.x, ctx.playerPos.z - s.target.z);
      if (d < s.radius) {
        holdTime += ctx.dt;
        if (holdTime >= s.holdSeconds) return advanceStage();
      } else {
        holdTime = Math.max(0, holdTime - ctx.dt * 2);
      }
    }
    return null;
  }

  function progress() {
    const j = job();
    return {
      jobIndex, stageIndex, completedJobs,
      jobTitle: j.title, chapter: j.chapter,
      stageText: stage().text,
      stageNum: stageIndex + 1, stageTotal: j.stages.length,
      holdFrac: stage().kind === 'hold' ? holdTime / stage().holdSeconds : 0,
      target: stage().target || null,
      giver: CREW[j.giver],
    };
  }

  function setState(index, stageIdx, completed) {
    jobIndex = index;
    stageIndex = stageIdx;
    completedJobs = completed;
    holdTime = 0;
    stageTimer = 0;
    stageSawWanted = false;
    placeMarker();
  }

  return {
    JOBS, job, stage, isDone, startJob, nextDialogue, update, progress,
    setState, advanceStage, placeMarker,
    get currentDialogue() { return currentDialogue; },
    get marker() { return marker; },
  };
}
