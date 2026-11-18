// The heat: wanted stars, SBPD cruisers that chase, ram and roadblock, the
// police helicopter at three stars, and the bust. Cops see the player when
// they are near or the helicopter is up; unseen, the heat cools off.

import * as THREE from 'three';
import { COP_STATUS, COP_UNITS, WANTED } from './config.js';
import { createVehicle, driveVehicle } from './vehicles.js';
import { nearestRoadPoint, onRoad } from './city.js';
import { range, pick } from './random.js';

function buildHelicopter(r) {
  const g = new THREE.Group();
  // Dark-slate SBPD helicopter with a white stripe: it has to silhouette
  // against a bright pink sunset sky (a white body vanishes into the glow).
  // A touch of emissive keeps the camera-facing side from going black, since
  // the sun is behind it.
  const heliBody = r.mat(0x2b3a55, { emissive: 0x2b3a55, emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(r.geo.box, heliBody);
  body.scale.set(4.2, 1.6, 1.9);
  body.castShadow = true;
  g.add(body);
  const stripe = new THREE.Mesh(r.geo.box, r.mat(0xe8e8e8));
  stripe.scale.set(4.25, 0.4, 1.95);
  stripe.position.y = -0.3;
  g.add(stripe);
  const glass = new THREE.Mesh(r.geo.box, r.mat(0x9fd4e8));
  glass.scale.set(1.2, 1.0, 1.7);
  glass.position.set(2.2, 0.2, 0);
  g.add(glass);
  const tail = new THREE.Mesh(r.geo.box, r.mat(0x1c2f4a));
  tail.scale.set(3.4, 0.5, 0.5);
  tail.position.set(-3.6, 0.4, 0);
  g.add(tail);
  const rotor = new THREE.Mesh(r.geo.box, r.mat(0x14171c));
  rotor.scale.set(9.5, 0.08, 0.4);
  rotor.position.y = 1.1;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(r.geo.box, r.mat(0x14171c));
  tailRotor.scale.set(0.08, 2.2, 0.3);
  tailRotor.position.set(-5.2, 0.5, 0);
  g.add(tailRotor);
  // Searchlight cone + a bright pool on the ground below, so the helicopter
  // reads clearly even at a glance. The cone is scaled in update() so its
  // tip stays at the helicopter and its base lands exactly on the ground
  // under it (heights are in the group's local units — divide by the group
  // scale — or the cone ends up buried below the road).
  const light = new THREE.Mesh(
    new THREE.ConeGeometry(4, 46, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
  );
  light.position.set(1.5, -7, 0);
  g.add(light);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(4, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(1.5, -13, 0);
  g.add(pool);
  // Red anti-collision beacon on the tail, blinking in update().
  const beacon = new THREE.Mesh(
    r.geo.sph,
    r.mat(0xff2222, { emissive: 0xff2222, emissiveIntensity: 3 }),
  );
  beacon.scale.set(0.7, 0.7, 0.7);
  beacon.position.set(-4.6, 1.3, 0);
  g.add(beacon);
  // The helicopter is big on purpose: it has to loom over the chase.
  g.scale.setScalar(1.8);
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  g.userData.pool = pool;
  g.userData.cone = light;
  g.userData.beacon = beacon;
  return g;
}

export function createPolice(r, city, random, audio) {
  let stars = 0;
  let unseenTimer = 0;
  let bustTimer = 0;
  let busted = false;
  const cops = []; // {vehicle, name, status, stuckTimer, reverseTimer}
  let heli = null;
  let heliAlt = 24; // helicopter cruise altitude (staging can lower it)
  let flash = 0;

  function spawnCop(near) {
    // Spawn on the player's road, behind their direction of travel, so the
    // cruiser joins the chase on asphalt instead of inside a building.
    const road = nearestRoadPoint(near.x, near.z);
    const heading = Math.hypot(near.vx ?? 0, near.vz ?? 0) > 3
      ? Math.atan2(-(near.vz ?? 0), near.vx ?? 0)
      : near.angle ?? 0;
    const back = range(random, 25, 45);
    let x;
    let z;
    if (road.axis === 'z') {
      x = road.x;
      z = near.z - Math.sin(heading) * back;
    } else {
      x = near.x - Math.cos(heading) * back;
      z = road.z;
    }
    const v = createVehicle(r, city, 'police', x, z, heading, 0xf2f2f2, random);
    v.speed = 40; // already rolling: the chase is on when they arrive
    const name = COP_UNITS[cops.length % COP_UNITS.length];
    cops.push({ vehicle: v, name, status: 'PURSUIT', stuckTimer: 0, reverseTimer: 0, statusTimer: 0 });
  }

  function spawnHeli(at) {
    heli = buildHelicopter(r);
    heli.position.set(at.x + 30, 42, at.z - 30);
    r.scene.add(heli);
  }

  function removeHeli() {
    if (heli) { r.scene.remove(heli); heli = null; }
  }

  return {
    get stars() { return stars; },
    get busted() { return busted; },
    get cops() { return cops; },
    get heliUp() { return heli !== null; },
    get heli() { return heli; },
    // Staging only: fly the helicopter lower so it looms in the frame.
    setHeliAlt(v) { heliAlt = v; },
    addWanted(n) {
      if (stars < WANTED.maxStars) {
        stars = Math.min(WANTED.maxStars, stars + n);
        unseenTimer = 0;
      }
    },
    clearWanted() {
      stars = 0;
      unseenTimer = 0;
      bustTimer = 0;
      for (const c of cops) c.vehicle.destroy();
      cops.length = 0;
      removeHeli();
    },
    setStars(n) {
      stars = Math.max(0, Math.min(WANTED.maxStars, n));
      unseenTimer = 0;
    },
    resetBusted() { busted = false; bustTimer = 0; },
    update(dt, player, playerInCar) {
      flash += dt;
      const want = WANTED.copCarsPerStar[stars] ?? 0;
      while (cops.length < want) spawnCop(player);
      while (cops.length > want) {
        const c = cops.pop();
        c.vehicle.destroy();
      }
      if (stars >= WANTED.heliAtStars && !heli) spawnHeli(player);
      if (stars < WANTED.heliAtStars && heli) removeHeli();

      // Is the player seen? A cop within 85 units, or the helicopter, sees all.
      let seen = heli !== null;
      let nearestCop = Infinity;
      for (const c of cops) {
        const d = Math.hypot(c.vehicle.x - player.x, c.vehicle.z - player.z);
        nearestCop = Math.min(nearestCop, d);
        if (d < 85) seen = true;
      }
      if (stars > 0) {
        if (seen) unseenTimer = 0;
        else {
          unseenTimer += dt;
          if (unseenTimer >= WANTED.decaySeconds) {
            stars -= 1;
            unseenTimer = 0;
          }
        }
      }

      // Chase AI: steer at the player's predicted position, ram when close,
      // reverse out when stuck. Status names feed the HUD's unit list.
      for (const c of cops) {
        const v = c.vehicle;
        // Off the road, head for the nearest road first; on it, chase.
        let px = player.x + (player.vx ?? 0) * 0.6;
        let pz = player.z + (player.vz ?? 0) * 0.6;
        if (!onRoad(v.x, v.z)) {
          const road = nearestRoadPoint(v.x, v.z);
          px = road.x;
          pz = road.z;
        }
        const dx = px - v.x;
        const dz = pz - v.z;
        const dist = Math.hypot(player.x - v.x, player.z - v.z);
        const wantAngle = Math.atan2(-dz, dx);
        let diff = wantAngle - v.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 2.2));
        if (Math.abs(v.speed) < 1.5) c.stuckTimer += dt;
        else c.stuckTimer = 0;
        if (c.stuckTimer > 1.2) { c.reverseTimer = 0.8; c.stuckTimer = 0; }
        if (c.reverseTimer > 0) {
          c.reverseTimer -= dt;
          driveVehicle(v, -1, -steer, false, dt);
        } else {
          driveVehicle(v, 1, steer, false, dt);
        }
        v.update(dt);
        c.statusTimer -= dt;
        if (c.statusTimer <= 0) {
          c.statusTimer = 1.2;
          c.status = dist < 8 ? pick(random, ['RAMMING', 'BOXING IN']) : dist < 30 ? 'PURSUIT' : dist < 60 ? 'CLOSING IN' : 'PURSUIT';
        }
        c.distance = Math.round(dist);
        // Flashing light bar + the red/blue spill on the asphalt.
        const on = Math.floor(flash * 6) % 2 === 0;
        const lights = v.mesh.userData.lights;
        if (lights) {
          lights.red.visible = on;
          lights.blue.visible = !on;
        }
        const glow = v.mesh.userData.glow;
        if (glow) {
          glow.red.visible = on;
          glow.blue.visible = !on;
        }
      }

      // Helicopter shadows the player from above, leading their motion so it
      // stays in view ahead of a fast car — offset well to the side (south),
      // so the camera sees its 3/4 profile instead of a foreshortened sliver.
      if (heli) {
        const lead = 0.7;
        const target = {
          x: player.x + (player.vx ?? 0) * lead + 2,
          z: player.z + (player.vz ?? 0) * lead + 14,
        };
        heli.position.x += (target.x - heli.position.x) * Math.min(1, 2.5 * dt);
        heli.position.z += (target.z - heli.position.z) * Math.min(1, 2.5 * dt);
        heli.position.y = heliAlt + Math.sin(flash * 1.4) * 1.5;
        // The spotlight sweeps diagonally across the street, RIPTIDE-style:
        // tilt the cone and keep the pool under its base on the ground. The
        // cone and pool are children of the scaled heli group, so their
        // heights are local units: local height = world height / group scale.
        const sweep = Math.sin(flash * 0.8) * 0.35;
        const s = heli.scale.x;
        const lh = heli.position.y / s; // local height from heli to ground
        heli.userData.cone.rotation.z = sweep;
        heli.userData.cone.position.y = -lh / 2;
        heli.userData.cone.scale.y = Math.max(0.1, (lh / 46) / Math.cos(sweep));
        heli.userData.pool.position.y = -lh + 0.2;
        heli.userData.pool.position.x = (1.5 + Math.sin(sweep) * heli.position.y) / s;
        heli.userData.beacon.visible = Math.floor(flash * 2) % 2 === 0;
        heli.rotation.y = Math.atan2(-(player.z - heli.position.z), player.x - heli.position.x);
        heli.userData.rotor.rotation.y += dt * 28;
        heli.userData.tailRotor.rotation.x += dt * 30;
      }

      // Bust: on foot, slow, and a cruiser right on top of you.
      if (stars > 0 && !playerInCar && nearestCop < WANTED.bustRadius && Math.abs(player.speed ?? 0) < 2) {
        bustTimer += dt;
        if (bustTimer >= WANTED.bustSeconds) {
          busted = true;
          audio.busted();
        }
      } else {
        bustTimer = Math.max(0, bustTimer - dt);
      }
      audio.siren(stars > 0);
      return { seen, nearestCop };
    },
  };
}
