// SOLMAR BAY — police: wanted 0–5 stars, named units, pursuit AI, and the
// AIR-1 helicopter with a narrow searchlight cone. setWanted sets heat.
import * as THREE from 'three';
import { buildCar, placeCar } from './cars.js';

const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 33', 'UNIT 9', 'UNIT 4'];

function buildHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.4, metalness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.4, metalness: 0.3 });
  // Rounded body: squashed sphere + glass nose.
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), bodyMat);
  body.scale.set(1, 0.85, 1.7);
  body.castShadow = true;
  g.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x10202e, roughness: 0.1, metalness: 0.8 }));
  glass.scale.set(1, 0.8, 1);
  glass.position.set(0, 0.1, 1.1);
  glass.rotation.x = Math.PI / 2.4;
  g.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.2), whiteMat);
  stripe.position.set(0, 0.1, -0.2);
  g.add(stripe);
  // Tail boom + fin.
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.4, 8), bodyMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.25, -2.9);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.6), bodyMat);
  fin.position.set(0, 0.7, -4.4);
  g.add(fin);
  // Skids.
  for (const sx of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), whiteMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx * 0.9, -0.95, 0);
    g.add(skid);
  }
  // Main rotor (spins) + tail rotor.
  const rotor = new THREE.Group();
  rotor.position.y = 1.05;
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.04, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5 }));
    blade.rotation.y = (i * Math.PI) / 2;
    rotor.add(blade);
  }
  g.add(rotor);
  // Searchlight cone: NARROW, faint, FrontSide (V6 fix — wide cones blind the shot).
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.06,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 24, 16, 1, true), coneMat);
  cone.position.y = -12;
  cone.rotation.x = Math.PI; // apex up at the heli, opening down
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2c0, 60, 60, 0.22, 0.6, 1.2);
  spot.position.y = -0.5;
  spot.target.position.set(0, -20, 0); // beam points down at the street
  g.add(spot);
  g.add(spot.target);
  return { group: g, rotor, cone, spot };
}

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.wanted = 0;
    this.heat = 0; // 0..100, drives spawn rate + aggression
    this.units = []; // { car, name, speed, offset }
    this.heli = null;
    this.flashT = 0;
    this.redLight = new THREE.PointLight(0xff1020, 0, 18, 1.6);
    this.blueLight = new THREE.PointLight(0x2040ff, 0, 18, 1.6);
    scene.add(this.redLight);
    scene.add(this.blueLight);
  }

  setWanted(n) {
    this.wanted = Math.max(0, Math.min(5, n));
    this.heat = this.wanted * 20;
    this.syncUnits();
  }

  addHeat(n) {
    this.heat = Math.max(0, Math.min(100, this.heat + n));
    const w = this.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(this.heat / 20));
    if (w !== this.wanted) this.setWanted(w);
  }

  syncUnits() {
    const want = this.wanted === 0 ? 0 : Math.min(4, 1 + this.wanted);
    while (this.units.length < want) this.spawnUnit();
    while (this.units.length > want) {
      const u = this.units.pop();
      this.scene.remove(u.car.group);
      if (u.pool) this.scene.remove(u.pool);
    }
    if (this.wanted >= 3 && !this.heli) {
      this.heli = buildHelicopter();
      // Park it in the sky immediately: in a frozen shot update() never runs,
      // so a heli left at the origin would sit on the road.
      this.heli.group.position.set(12, 26, 28);
      this.scene.add(this.heli.group);
    } else if (this.wanted < 3 && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
  }

  spawnUnit(at) {
    const car = buildCar({ kind: 'sedan', police: true, spoiler: false });
    const name = UNIT_NAMES[this.units.length % UNIT_NAMES.length];
    const pos = at || {
      x: (Math.random() - 0.5) * 60,
      z: -60 - Math.random() * 40,
    };
    placeCar(car, pos.x, pos.z, 0);
    this.scene.add(car.group);
    // Red/blue light pool on the road under the unit (alternates with the flash).
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xff1020, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(pos.x, 0.06, pos.z);
    this.scene.add(pool);
    this.units.push({ car, name, speed: 14 + Math.random() * 6, offset: (Math.random() - 0.5) * 6, pool, poolMat });
    return car;
  }

  // Place units exactly (used by the chase shot). Any extra units go far
  // behind the hero so they never clutter the frame. Pools move with the cars
  // (the shot is frozen, so update() never re-positions them).
  placeUnits(spots) {
    this.setWanted(3);
    spots.forEach((s, i) => {
      if (i < this.units.length) {
        placeCar(this.units[i].car, s.x, s.z, s.heading ?? 0);
        if (this.units[i].pool) this.units[i].pool.position.set(s.x, 0.06, s.z);
      }
    });
    for (let i = spots.length; i < this.units.length; i++) {
      placeCar(this.units[i].car, i % 2 ? 4 : -4, -70 - i * 12, 0);
      if (this.units[i].pool) this.units[i].pool.position.set(i % 2 ? 4 : -4, 0.06, -70 - i * 12);
    }
  }

  update(dt, playerPos, playerSpeed, t) {
    this.flashT += dt;
    const phase = Math.floor(this.flashT / 0.28) % 2 === 0;
    for (const u of this.units) {
      if (u.car.lightBar) {
        u.car.lightBar.redMat.emissiveIntensity = phase ? 5 : 0.6;
        u.car.lightBar.blueMat.emissiveIntensity = phase ? 0.6 : 5;
      }
      // Light pool follows the unit and alternates red/blue.
      if (u.pool) {
        const gp = u.car.group.position;
        u.pool.position.set(gp.x, 0.06, gp.z);
        u.poolMat.color.setHex(phase ? 0xff1020 : 0x2040ff);
      }
      // Pursuit: steer toward the player with a lateral offset, match speed.
      const g = u.car.group;
      const dx = playerPos.x + u.offset - g.position.x;
      const dz = playerPos.z + 4 - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2.5) {
        const targetHeading = Math.atan2(dx, dz);
        let dh = targetHeading - g.rotation.y;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        g.rotation.y += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
        const speed = Math.min(u.speed, dist * 1.2 + playerSpeed * 0.55);
        g.position.x += Math.sin(g.rotation.y) * speed * dt;
        g.position.z += Math.cos(g.rotation.y) * speed * dt;
        u.car.spinWheels(speed * dt);
      }
    }
    // Alternating red/blue point light over the nearest unit.
    if (this.units.length) {
      const g = this.units[0].car.group.position;
      this.redLight.position.set(g.x, 2.4, g.z);
      this.blueLight.position.set(g.x, 2.4, g.z);
      this.redLight.intensity = phase ? 26 : 0;
      this.blueLight.intensity = phase ? 0 : 26;
    } else {
      this.redLight.intensity = 0;
      this.blueLight.intensity = 0;
    }
    // Helicopter: orbit above the player, searchlight tracking them.
    if (this.heli) {
      const h = this.heli;
      const a = t * 0.22;
      h.group.position.set(playerPos.x + Math.cos(a) * 16, 26, playerPos.z + Math.sin(a) * 16);
      h.group.lookAt(playerPos.x, 0, playerPos.z);
      h.rotor.rotation.y += dt * 22;
      h.spot.target.position.set(playerPos.x, 0, playerPos.z);
      // Aim the cone at the player (cone hangs straight down; tilt the group slightly).
      h.group.rotation.x = 0;
    }
  }
}
