// Missions: the Sunset Sprint checkpoint loop, the timer, cash rewards and
// drift scoring. Checkpoint rings are glowing toruses with light beams.

import { CFG } from './config.js';

export function createMissions(scene, hooks) {
  const rings = [];
  const cps = CFG.checkpoints;

  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const prev = cps[(i - 1 + cps.length) % cps.length];
    const face = Math.atan2(cp.x - prev.x, cp.z - prev.z);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x201404,
      emissive: 0xff8c1a,
      emissiveIntensity: 0.6,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 10, 40), ringMat);
    ring.position.set(cp.x, 3.4, cp.z);
    ring.rotation.y = face;

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff9a2e,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 34, 12, 1, true),
      beamMat,
    );
    beam.position.set(cp.x, 17, cp.z);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(5.6, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff9a2e,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(cp.x, 0.08, cp.z);

    beam.visible = false;
    disc.visible = false;
    scene.add(ring, beam, disc);
    rings.push({ ring, beam, disc, ringMat, ...cp });
  }

  let index = 0;
  let timeLeft = CFG.missionTime;
  let active = true;
  let restartTimer = 0;
  let cash = 0;
  let driftPoints = 0;
  let driftBanked = 0;
  let bestDrift = 0;
  let wasDrifting = false;
  let missionsWon = 0;

  function refreshRings(time) {
    rings.forEach((r, i) => {
      if (i < index) {
        r.ringMat.emissive.setHex(0x2ecc71);
        r.ringMat.emissiveIntensity = 0.5;
        r.beam.visible = false;
        r.disc.visible = false;
      } else if (i === index && active) {
        r.ringMat.emissive.setHex(0xff8c1a);
        r.ringMat.emissiveIntensity = 2.2 + Math.sin(time * 3.5) * 0.6;
        r.beam.visible = true;
        r.disc.visible = true;
        const s = 1 + Math.sin(time * 3.5) * 0.03;
        r.ring.scale.setScalar(s);
      } else {
        r.ringMat.emissive.setHex(0xff8c1a);
        r.ringMat.emissiveIntensity = 0.55;
        r.beam.visible = false;
        r.disc.visible = false;
      }
    });
  }

  function reset() {
    index = 0;
    timeLeft = CFG.missionTime;
    active = true;
    restartTimer = 0;
    driftPoints = 0;
    wasDrifting = false;
  }

  function update(dt, playerPos, speed, drifting, driftAngle, time) {
    refreshRings(time);

    // Drift scoring: bank the run when the slide ends.
    if (drifting && Math.abs(speed) > 8) {
      driftPoints += driftAngle * Math.abs(speed) * dt * 3.2;
    } else if (wasDrifting && driftPoints > 25) {
      const pts = Math.floor(driftPoints);
      const payout = Math.floor(pts / 10);
      cash += payout;
      driftBanked += pts;
      bestDrift = Math.max(bestDrift, pts);
      hooks.onDriftBanked?.(pts, payout);
      driftPoints = 0;
    } else if (!drifting) {
      driftPoints = 0;
    }
    wasDrifting = drifting;

    if (!active) {
      restartTimer -= dt;
      if (restartTimer <= 0) reset();
      return;
    }

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      active = false;
      restartTimer = 4;
      hooks.onMissionFailed?.();
      return;
    }

    const cp = rings[index];
    const d = Math.hypot(playerPos.x - cp.x, playerPos.z - cp.z);
    if (d < 7.5) {
      index++;
      timeLeft += CFG.checkpointBonus;
      cash += 150;
      hooks.onCheckpoint?.(index, cps.length, cp.name);
      if (index >= rings.length) {
        cash += 1000;
        missionsWon++;
        active = false;
        restartTimer = 5;
        hooks.onMissionComplete?.(missionsWon);
      }
    }
  }

  return {
    get index() {
      return index;
    },
    get timeLeft() {
      return timeLeft;
    },
    get cash() {
      return cash;
    },
    get driftPoints() {
      return Math.floor(driftPoints);
    },
    get bestDrift() {
      return bestDrift;
    },
    get missionsWon() {
      return missionsWon;
    },
    get active() {
      return active;
    },
    get checkpoints() {
      return rings;
    },
    get nextCheckpoint() {
      return rings[Math.min(index, rings.length - 1)];
    },
    spend(amount) {
      cash = Math.max(0, cash - amount);
    },
    // Bank the run's cash into the persistent wallet; returns the amount.
    bank() {
      const c = cash;
      cash = 0;
      return c;
    },
    reset,
    update,
  };
}
