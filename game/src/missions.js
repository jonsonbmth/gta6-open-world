// The story: seven numbered jobs with a crew that talks. Each job is a chain
// of steps — drive here, steal that, lose the cops, clear the square — with a
// beacon in the world, a line of dialogue per step, and a payout at the end.
// Also owns the rival crew members the fight steps spawn.

import { JOBS, PLACES } from './config.js';
import { createVehicle } from './vehicles.js';
import { buildPersonMesh, animateWalk } from './pedestrians.js';
import { collideCircle } from './city.js';
import { range } from './random.js';

function createRival(r, city, x, z, random) {
  const mesh = buildPersonMesh(r, { shirt: 0x8c2f2f, pants: 0x1f2a33, hair: 0x0f0c0a });
  mesh.position.set(x, 0, z);
  r.scene.add(mesh);
  const rival = {
    mesh, x, z, hp: 60, state: 'alive', punchCd: 0, fallTimer: 0,
    takeDamage(n) {
      if (this.state !== 'alive') return;
      this.hp -= n;
      if (this.hp <= 0) {
        this.state = 'down';
        this.fallTimer = 3;
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.4;
      }
    },
    update(dt, player) {
      if (this.state === 'down') {
        this.fallTimer -= dt;
        return;
      }
      this.punchCd -= dt;
      const dx = player.x - this.x;
      const dz = player.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.2) {
        this.x += (dx / d) * 5.5 * dt;
        this.z += (dz / d) * 5.5 * dt;
        const p = { x: this.x, z: this.z };
        collideCircle(city.colliders, p, 0.6);
        this.x = p.x;
        this.z = p.z;
        animateWalk(mesh, dt, 5.5);
      } else if (this.punchCd <= 0 && !player.inCar) {
        this.punchCd = 0.9;
        player.damage(8);
      }
      mesh.position.set(this.x, mesh.position.y, this.z);
      mesh.rotation.y = Math.atan2(-(player.z - this.z), player.x - this.x);
    },
    destroy() { r.scene.remove(mesh); },
  };
  return rival;
}

export function createMissions(r, city, random, hud, audio) {
  let jobIndex = 0; // 0-based; 7 means the story is done
  let stepIndex = 0;
  let active = false;
  let jobVehicles = [];
  let rivals = [];
  let chaseTarget = null; // the money truck in Job 4
  let chaseHp = 100;
  let ramCooldown = 0;
  let nextJobTimer = -1;
  let completed = 0;

  function currentJob() { return JOBS[jobIndex]; }
  function currentStep() { return currentJob()?.steps[stepIndex]; }

  function clearJobEntities() {
    for (const v of jobVehicles) v.destroy();
    jobVehicles = [];
    for (const rv of rivals) rv.destroy();
    rivals = [];
    chaseTarget = null;
  }

  function spawnStepEntities(step) {
    const place = PLACES[step.target];
    if (!place) return;
    if (step.vehicle === 'truck') {
      jobVehicles.push(createVehicle(r, city, 'truck', place.x + 6, place.z, Math.PI / 2, 0x2b6cb0, random));
    }
    if (step.type === 'steal' && jobIndex === 1) {
      jobVehicles.push(createVehicle(r, city, 'sports', place.x - 4, place.z + 4, 0, 0xc23b3b, random));
    }
    if (step.type === 'steal' && jobIndex === 5) {
      jobVehicles.push(createVehicle(r, city, 'truck', place.x + 6, place.z, Math.PI / 2, 0xd9a441, random));
    }
    if (step.type === 'chase') {
      chaseTarget = createVehicle(r, city, 'truck', place.x, place.z, 0, 0xe8b93b, random);
      chaseTarget.cruise = 18;
      chaseTarget.speed = 18; // already rolling when the job starts
      jobVehicles.push(chaseTarget);
      chaseHp = 100;
      ramCooldown = 0;
    }
    if (step.type === 'fight') {
      const n = jobIndex === 6 ? 5 : 4;
      for (let i = 0; i < n; i += 1) {
        rivals.push(createRival(r, city, place.x + range(random, -12, 12), place.z + range(random, -12, 12), random));
      }
    }
  }

  function startStep() {
    const step = currentStep();
    if (!step) return;
    city.showBeacon(step.target, true);
    spawnStepEntities(step);
    if (step.say) hud.say(step.say[0], step.say[1], 5);
    hud.setMission(currentJob(), step, stepIndex);
  }

  function startJob(index) {
    jobIndex = index;
    stepIndex = 0;
    active = true;
    clearJobEntities();
    city.hideAllBeacons();
    const job = currentJob();
    hud.say(job.giver, job.intro, 6);
    startStep();
  }

  function completeJob(player, onSave) {
    const job = currentJob();
    completed += 1;
    player.addMoney(job.pay);
    player.addRep(job.rep);
    audio.complete();
    hud.banner('JOB COMPLETE', `+$${job.pay.toLocaleString()}  ·  +${job.rep} REP`);
    hud.say(job.giver, 'Job done. The bay remembers, Rico.', 4);
    active = false;
    clearJobEntities();
    city.hideAllBeacons();
    hud.setMission(null, null);
    if (onSave) onSave();
    if (jobIndex + 1 < JOBS.length) {
      nextJobTimer = 5;
    } else {
      hud.banner('KING OF THE BAY', 'All 7 jobs complete — Solmar Bay is yours.');
    }
  }

  function advanceStep(player, onSave) {
    stepIndex += 1;
    if (stepIndex >= currentJob().steps.length) {
      completeJob(player, onSave);
      return;
    }
    city.hideAllBeacons();
    startStep();
  }

  return {
    get jobIndex() { return jobIndex; },
    get stepIndex() { return stepIndex; },
    get active() { return active; },
    get completed() { return completed; },
    get rivals() { return rivals; },
    get jobVehicles() { return jobVehicles; },
    get chaseTarget() { return chaseTarget; },
    get currentStep() { return currentStep(); },
    get currentJob() { return currentJob(); },
    startJob,
    // Screenshot staging only: jump straight to a job's step (the beacon,
    // the step's vehicles and its dialogue all come with it).
    debugJump(job, step) {
      jobIndex = job;
      stepIndex = step;
      active = true;
      clearJobEntities();
      city.hideAllBeacons();
      startStep();
    },
    setProgress(index, done) {
      jobIndex = index;
      completed = done;
    },
    targetPos() {
      const step = currentStep();
      if (!step) return null;
      return PLACES[step.target] ?? null;
    },
    update(dt, player, police, onSave) {
      if (nextJobTimer > 0) {
        nextJobTimer -= dt;
        if (nextJobTimer <= 0) startJob(jobIndex + 1);
        return;
      }
      if (!active) return;
      const step = currentStep();
      if (!step) return;
      const place = PLACES[step.target];

      // Rivals fight the player until the step ends.
      for (let i = rivals.length - 1; i >= 0; i -= 1) {
        const rv = rivals[i];
        rv.update(dt, player);
        if (rv.state === 'down' && rv.fallTimer <= 0) {
          rv.destroy();
          rivals.splice(i, 1);
        }
      }

      // The money truck flees along the coast road until it is rammed to a stop.
      if (step.type === 'chase' && chaseTarget) {
        const t = chaseTarget;
        ramCooldown = Math.max(0, ramCooldown - dt);
        if (chaseHp > 0) {
          t.angle = Math.PI; // the money truck flees west, into the sunset
          t.speed += (t.cruise - t.speed) * Math.min(1, dt);
          t.update(dt);
          const pd = Math.hypot(player.x - t.x, player.z - t.z);
          if (player.inCar && pd < 6 && Math.abs(player.speed) > 18 && ramCooldown <= 0) {
            ramCooldown = 0.6;
            chaseHp -= 26;
            audio.crash();
            if (chaseHp <= 0) {
              t.speed = 0;
              hud.say('RICO', 'Got him! Grab the cash from the back!', 4);
            }
          }
        } else if (Math.hypot(player.x - t.x, player.z - t.z) < 7) {
          advanceStep(player, onSave);
          return;
        }
      }

      const d = place ? Math.hypot(player.x - place.x, player.z - place.z) : Infinity;
      switch (step.type) {
        case 'goto':
          if (d < 9) advanceStep(player, onSave);
          break;
        case 'enter':
          if (player.inCar && player.vehicle?.type === 'truck' && d < 25) advanceStep(player, onSave);
          break;
        case 'steal':
          if (player.inCar && d < 25) {
            police.addWanted(2);
            advanceStep(player, onSave);
          }
          break;
        case 'escape':
          if (police.stars === 0 && d < 12) advanceStep(player, onSave);
          break;
        case 'fight':
          if (rivals.length === 0) advanceStep(player, onSave);
          break;
        default:
          break;
      }
    },
  };
}
