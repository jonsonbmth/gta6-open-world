// Police: the wanted system. Stars rise when the player causes trouble and
// fall when the player escapes; the dispatch board lists the responding
// units; cruisers chase the player along the roads; at 3+ stars the police
// helicopter joins (its mesh lives in heli.js — this module only decides
// WHEN it flies, never where it renders).

import { makeRng, clamp } from './util.js';
import { buildPoliceCruiser } from './vehicles.js';

const UNIT_NAMES = ['FALCON-2', 'OSPREY-7', 'HERON-4', 'KITE-9', 'TALON-5', 'MERLIN-3'];
const UNIT_ROLES = ['PURSUE', 'FLANKING', 'RAMMING', 'CLOSING IN', 'ROADBLOCK', 'SPOTLIGHT'];

export function createPolice(scene, seed) {
  const rng = makeRng(seed);
  const state = {
    stars: 0,
    heat: 0, // 0..100, drives star changes
    units: [],
    cruisers: [],
    heliActive: false,
    searchTimer: 0,
  };

  function spawnCruiser(x, z) {
    const mesh = buildPoliceCruiser();
    scene.add(mesh);
    const cruiser = {
      mesh,
      x,
      z,
      heading: 0,
      speed: 0,
      name: UNIT_NAMES[state.cruisers.length % UNIT_NAMES.length],
      role: rng.pick(UNIT_ROLES),
    };
    state.cruisers.push(cruiser);
    return cruiser;
  }

  function setStars(n) {
    state.stars = clamp(n, 0, 4);
    state.heliActive = state.stars >= 3;
    // Match the cruiser count to the wanted level.
    const want = state.stars === 0 ? 0 : state.stars + 1;
    while (state.cruisers.length < want) {
      const a = rng.next() * Math.PI * 2;
      spawnCruiser(Math.cos(a) * 45, Math.sin(a) * 45);
    }
    while (state.cruisers.length > want) {
      const c = state.cruisers.pop();
      scene.remove(c.mesh);
    }
    // Refresh the dispatch board.
    state.units = state.cruisers.map((c, i) => ({
      name: c.name,
      role: c.role,
      dist: 10 + i * 9,
    }));
    if (state.heliActive) {
      state.units.push({ name: 'AIR-3', role: 'SPOTLIGHT', dist: 36 });
    }
  }

  function addHeat(amount) {
    state.heat = clamp(state.heat + amount, 0, 100);
    const stars = state.heat < 12 ? 0 : state.heat < 35 ? 1 : state.heat < 60 ? 2 : state.heat < 85 ? 3 : 4;
    if (stars !== state.stars) setStars(stars);
  }

  return {
    state,
    setStars,
    addHeat,
    update(dt, playerPos, playerSpeed) {
      // Heat cools when the player is slow and out of sight; cruisers close
      // in when the player is fast and wanted.
      if (state.stars > 0 && playerSpeed < 2) {
        state.searchTimer += dt;
        if (state.searchTimer > 14) {
          state.searchTimer = 0;
          addHeat(-30);
        }
      } else {
        state.searchTimer = 0;
      }
      for (const c of state.cruisers) {
        const dx = playerPos.x - c.x;
        const dz = playerPos.z - c.z;
        const dist = Math.hypot(dx, dz) || 1;
        const wantHeading = Math.atan2(dx, dz);
        let dh = wantHeading - c.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        c.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
        const targetSpeed = dist > 60 ? 30 : dist > 25 ? 24 : 16;
        c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 1.2);
        c.x += Math.sin(c.heading) * c.speed * dt;
        c.z += Math.cos(c.heading) * c.speed * dt;
        c.x = clamp(c.x, -168, 168);
        c.z = clamp(c.z, -168, 168);
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;
        // Flashing beacons.
        const t = performance.now() / 180;
        const on = Math.sin(t) > 0;
        if (c.mesh.userData.beacons) {
          c.mesh.userData.beacons.red.visible = on;
          c.mesh.userData.beacons.blue.visible = !on;
        }
      }
      // Keep the dispatch distances honest.
      state.units.forEach((u, i) => {
        if (state.cruisers[i]) {
          const c = state.cruisers[i];
          u.dist = Math.round(Math.hypot(playerPos.x - c.x, playerPos.z - c.z));
        }
      });
    },
  };
}
