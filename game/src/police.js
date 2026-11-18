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
  const body = new THREE.Mesh(r.geo.box, r.mat(0x1c2f4a));
  body.scale.set(4.2, 1.6, 1.9);
  body.castShadow = true;
  g.add(body);
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
  const light = new THREE.Mesh(
    new THREE.ConeGeometry(6, 42, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  light.position.set(1.5, -21, 0);
  light.rotation.z = Math.PI;
  g.add(light);
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  return g;
}

export function createPolice(r, city, random, audio) {
  let stars = 0;
  let unseenTimer = 0;
  let bustTimer = 0;
  let busted = false;
  const cops = []; // {vehicle, name, status, stuckTimer, reverseTimer}
  let heli = null;
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
        // Flashing light bar.
        const on = Math.floor(flash * 6) % 2 === 0;
        const lights = v.mesh.userData.lights;
        if (lights) {
          lights.red.visible = on;
          lights.blue.visible = !on;
        }
      }

      // Helicopter shadows the player from above, leading their motion so it
      // stays in view ahead of a fast car.
      if (heli) {
        const lead = 0.7;
        const target = {
          x: player.x + (player.vx ?? 0) * lead + 6,
          z: player.z + (player.vz ?? 0) * lead - 8,
        };
        heli.position.x += (target.x - heli.position.x) * Math.min(1, 2.5 * dt);
        heli.position.z += (target.z - heli.position.z) * Math.min(1, 2.5 * dt);
        heli.position.y = 24 + Math.sin(flash * 1.4) * 1.5;
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
