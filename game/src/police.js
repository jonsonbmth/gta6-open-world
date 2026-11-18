// SOLMAR BAY — wanted system, police pursuit AI and the AIR-1 helicopter.
// Wanted 0–5 stars. Named units chase, ram and box the player in; at 3+
// stars the helicopter orbits overhead with a visible searchlight cone.
import * as THREE from 'three';
import { buildCar } from './cars.js';
import { POLICE_UNITS, HELI_NAME, TUNE } from './config.js';
import { makeGlowTexture, makeStreakTexture } from './textures.js';

const glowRed = makeGlowTexture('#ff2a2a');
const glowBlue = makeGlowTexture('#3b82ff');
const glowWhite = makeGlowTexture('#fff6d8');

function glowSprite(tex, scale, opacity = 0.85) {
  const m = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}

function blocked(colliders, x, z, pad = 1.2) {
  for (const c of colliders) {
    if (x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad) return true;
  }
  return false;
}

function buildHelicopter() {
  const heli = new THREE.Group();
  heli.name = HELI_NAME;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.6, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.2, 4, 10), bodyMat);
  body.rotation.x = Math.PI / 2;
  heli.add(body);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x0a101c, metalness: 0.9, roughness: 0.1 }),
  );
  glass.position.set(0, 0.1, 1.4);
  glass.scale.set(1, 0.8, 1);
  heli.add(glass);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 4.2, 6), bodyMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.2, -3.4);
  heli.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.8), bodyMat);
  fin.position.set(0, 0.7, -5.3);
  heli.add(fin);
  // Main rotor (two blades) + tail rotor.
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.6 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.06, 0.34), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.15;
  heli.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.2), bladeMat);
  tailRotor.position.set(0.2, 0.3, -5.4);
  heli.add(tailRotor);
  // Skids.
  for (const sx of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6), bladeMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx * 1.0, -1.25, 0.2);
    heli.add(skid);
  }
  // Searchlight cone (apex at the heli, opening downward) + ground pool.
  // Short and narrow: a 46m cone from a 20m heli hung through the road and
  // read as a giant grey tent on the cover. 24m ends just above the ground.
  const coneGeo = new THREE.ConeGeometry(4, 24, 16, 1, true);
  coneGeo.translate(0, -12, 0);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
    color: 0xfff6d8, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  cone.position.y = -1;
  heli.add(cone);
  const beacon = glowSprite(glowRed, 2.2, 0.9);
  beacon.position.set(0, -1.4, -1);
  heli.add(beacon);
  const spotGlow = glowSprite(glowWhite, 8, 0.75);
  spotGlow.position.set(0, -1.6, 1);
  heli.add(spotGlow);
  heli.userData = { rotor, tailRotor, cone, beacon };
  return heli;
}

export function createPolice(scene, rng, colliders) {
  const policeCars = [];
  const heli = buildHelicopter();
  heli.visible = false;
  scene.add(heli);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({
      map: glowWhite, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.08;
  pool.visible = false;
  scene.add(pool);
  // One shared strobe light: attached to the nearest police car, alternating red/blue.
  const strobe = new THREE.PointLight(0xff2222, 60, 26, 1.6);
  strobe.visible = false;
  scene.add(strobe);

  let heat = 0; // 0..100
  let heliAngle = 0;
  let spawnCooldown = 0;
  let heliFrozenPos = null; // screenshot staging: pin the helicopter in frame

  function wantedLevel() {
    if (heat < 8) return 0;
    if (heat < 26) return 1;
    if (heat < 46) return 2;
    if (heat < 66) return 3;
    if (heat < 86) return 4;
    return 5;
  }

  function spawnPoliceCar(playerPos, playerHeading) {
    const unitName = POLICE_UNITS[policeCars.length % POLICE_UNITS.length];
    const car = buildCar({ type: 'sedan', color: 0x0d0f14, name: unitName, police: true });
    // Spawn ahead of the player on the road, facing the player.
    const ahead = 26 + rng.range(0, 20);
    const side = rng.pick([-1, 1]) * rng.range(2, 6);
    const dirX = Math.sin(playerHeading), dirZ = Math.cos(playerHeading);
    const px = playerPos.x + dirX * ahead + -dirZ * side;
    const pz = playerPos.z + dirZ * ahead + dirX * side;
    car.position.set(px, 0, pz);
    car.rotation.y = playerHeading + Math.PI + rng.range(-0.3, 0.3);
    // Red/blue reflection streaks on the wet asphalt under the car.
    const streakRed = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 7),
      new THREE.MeshBasicMaterial({
        map: makeStreakTexture('#ff2222'), transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    streakRed.rotation.x = -Math.PI / 2;
    streakRed.position.set(-0.8, 0.05, -1.5);
    car.add(streakRed);
    const streakBlue = streakRed.clone();
    streakBlue.material = streakRed.material.clone();
    streakBlue.material.map = makeStreakTexture('#2266ff');
    streakBlue.position.x = 0.8;
    car.add(streakBlue);
    scene.add(car);
    const entry = {
      car, unitName, speed: 0,
      heading: car.rotation.y,
      streakRed, streakBlue,
    };
    policeCars.push(entry);
    return entry;
  }

  function removePoliceCar(entry) {
    scene.remove(entry.car);
    const i = policeCars.indexOf(entry);
    if (i !== -1) policeCars.splice(i, 1);
  }

  function raise(amount) {
    heat = Math.min(100, heat + amount);
  }
  function setWanted(level) {
    heat = [0, 15, 35, 55, 75, 95][Math.max(0, Math.min(5, level))];
  }

  function update(dt, t, player, onRam, visualOnly = false) {
    const level = wantedLevel();
    if (!visualOnly) {
      spawnCooldown -= dt;
      // Target fleet size by wanted level.
      const targetCars = level === 0 ? 0 : Math.min(level, 5);
      if (policeCars.length < targetCars && spawnCooldown <= 0 && level > 0) {
        spawnPoliceCar(player.pos, player.heading);
        spawnCooldown = 0.7;
      }
      if (level === 0) {
        while (policeCars.length > 0) removePoliceCar(policeCars[0]);
      }
      // Heat decays when the player is far from every unit.
      let nearest = Infinity;
      for (const p of policeCars) nearest = Math.min(nearest, p.car.position.distanceTo(player.pos));
      if (level > 0 && nearest > 90) heat = Math.max(0, heat - dt * 3.5);
      if (level > 0 && nearest > 55) heat = Math.max(0, heat - dt * 1.2);
    }

    // Chase AI (iterate a copy: a far car may be removed mid-loop).
    let nearestCar = null;
    for (const p of [...policeCars]) {
      const toPlayer = new THREE.Vector3().subVectors(player.pos, p.car.position);
      const dist = toPlayer.length();
      if (!nearestCar || dist < nearestCar.dist) nearestCar = { entry: p, dist };
      if (!visualOnly) {
        if (dist > 160) {
          // Too far: respawn closer instead of driving across the map.
          removePoliceCar(p);
          spawnCooldown = 0;
          continue;
        }
        const targetHeading = Math.atan2(toPlayer.x, toPlayer.z);
        let dh = targetHeading - p.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        p.heading += THREE.MathUtils.clamp(dh, -2.4 * dt, 2.4 * dt);
        const wantSpeed = dist > 30 ? TUNE.policeTopSpeed : TUNE.policeTopSpeed * 0.8;
        p.speed += (wantSpeed - p.speed) * Math.min(1, dt * 1.4);
        const nx = p.car.position.x + Math.sin(p.heading) * p.speed * dt;
        const nz = p.car.position.z + Math.cos(p.heading) * p.speed * dt;
        if (!blocked(colliders, nx, nz)) {
          p.car.position.x = nx;
          p.car.position.z = nz;
        } else if (!blocked(colliders, nx, p.car.position.z)) {
          p.car.position.x = nx;
        } else if (!blocked(colliders, p.car.position.x, nz)) {
          p.car.position.z = nz;
        } else {
          p.heading += Math.PI / 2 * dt * 3; // stuck: turn away
        }
        p.car.rotation.y = p.heading;
        // Spin wheels.
        for (const w of p.car.userData.wheels) w.rotation.x += (p.speed * dt) / 0.34;
        // Ram the player when close.
        if (dist < 3.4 && onRam) onRam(p);
      }
      // Light bar strobe: red/blue alternate ~3 Hz, offset per car.
      const lb = p.car.userData.lightBar;
      if (lb) {
        const on = Math.sin(t * 18 + lb.phase) > 0;
        lb.redMat.color.setHex(on ? 0xff2222 : 0x440000);
        lb.blueMat.color.setHex(on ? 0x001133 : 0x2266ff);
        lb.redGlow.material.opacity = on ? 0.95 : 0.1;
        lb.blueGlow.material.opacity = on ? 0.1 : 0.95;
        p.streakRed.material.opacity = on ? 0.75 : 0.15;
        p.streakBlue.material.opacity = on ? 0.15 : 0.75;
      }
    }

    // Shared strobe on the nearest car.
    if (nearestCar && nearestCar.dist < 60) {
      strobe.visible = true;
      strobe.position.copy(nearestCar.entry.car.position);
      strobe.position.y = 2.2;
      strobe.color.setHex(Math.sin(t * 18) > 0 ? 0xff2222 : 0x2266ff);
    } else {
      strobe.visible = false;
    }

    // Helicopter at 3+ stars.
    if (level >= 3) {
      heli.visible = true;
      pool.visible = true;
      if (heliFrozenPos) {
        heli.position.copy(heliFrozenPos);
      } else {
        heliAngle += dt * 0.22;
        const hx = player.pos.x + Math.cos(heliAngle) * 26;
        const hz = player.pos.z + Math.sin(heliAngle) * 26;
        heli.position.set(hx, 46, hz);
      }
      heli.lookAt(player.pos.x, 0, player.pos.z);
      heli.userData.rotor.rotation.y += dt * 28;
      heli.userData.tailRotor.rotation.z += dt * 40;
      heli.userData.beacon.material.opacity = Math.sin(t * 6) > 0 ? 0.9 : 0.15;
      // Aim the searchlight cone at the player.
      heli.userData.cone.lookAt(player.pos);
      heli.userData.cone.rotateX(-Math.PI / 2);
      pool.position.set(player.pos.x, 0.08, player.pos.z);
      pool.material.opacity = 0.26 + Math.sin(t * 3) * 0.05;
    } else {
      heli.visible = false;
      pool.visible = false;
    }

    return level;
  }

  return {
    update, raise, setWanted, wantedLevel,
    setHeliPos: (x, y, z) => { heliFrozenPos = new THREE.Vector3(x, y, z); },
    get heat() { return heat; },
    get cars() { return policeCars; },
    get heli() { return heli; },
    spawnPoliceCar, removePoliceCar,
  };
}
