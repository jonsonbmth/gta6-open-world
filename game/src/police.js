// Wanted system: 0–5 stars, named police units in pursuit, AIR-1 helicopter
// with a short, narrow, low-opacity searchlight cone.

import { Car } from './cars.js';
import { clamp, glowTexture } from './utils.js';

const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 4', 'UNIT 9'];

function buildHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 3.4), bodyMat);
  g.add(body);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.6, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.05, metalness: 0.9 }),
  );
  glass.position.set(0, 0.2, -1.4);
  g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 3.2), bodyMat);
  tail.position.set(0, 0.2, 3.0);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.06, 0.3), bodyMat);
  rotor.position.y = 0.85;
  g.add(rotor);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.74, 0.24, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x2266ff }),
  );
  stripe.position.y = 0.1;
  g.add(stripe);
  // searchlight: SHORT (24m), narrow (radius 4), LOW opacity (0.12)
  const coneGeo = new THREE.ConeGeometry(4, 24, 20, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -12;
  cone.rotation.x = Math.PI; // apex up at the heli, opening down
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2c0, 90, 34, 0.32, 0.6, 1.2);
  spot.position.set(0, -0.4, 0);
  const target = new THREE.Object3D();
  target.position.set(0, -24, 0);
  g.add(target);
  spot.target = target;
  g.add(spot);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  beacon.position.y = -0.7;
  g.add(beacon);
  return { group: g, rotor, cone, spot, target };
}

export class PoliceSystem {
  constructor(scene) {
    this.scene = scene;
    this.wanted = 0;
    this.heat = 0; // 0..100, decays when unseen
    this.pursuit = [];
    this.heli = null;
    this.heliAngle = 0;
    this.pursuitActive = false;
    this.lastSeen = 0;
  }

  setWanted(n) {
    this.wanted = clamp(Math.round(n), 0, 5);
    // keep heat in sync so the wanted level does not instantly clear itself
    if (this.wanted > 0) this.heat = Math.max(this.heat, 12 + this.wanted * 14);
    else this.heat = 0;
    this._syncUnits();
  }

  addHeat(n) {
    this.heat = clamp(this.heat + n, 0, 100);
    const stars = this.heat < 12 ? 0 : this.heat < 30 ? 1 : this.heat < 50 ? 2 : this.heat < 70 ? 3 : this.heat < 88 ? 4 : 5;
    if (stars !== this.wanted) this.setWanted(stars);
  }

  _syncUnits() {
    const want = this.wanted === 0 ? 0 : this.wanted < 3 ? 1 : this.wanted < 5 ? 2 : 3;
    while (this.pursuit.length < want) {
      const unit = new Car({ profile: 'sedan', color: 0x14161d, name: UNIT_NAMES[this.pursuit.length % UNIT_NAMES.length], police: true });
      unit.group.visible = false; // placed at a real spot by update() before showing
      this.scene.add(unit.group);
      this.pursuit.push(unit);
    }
    while (this.pursuit.length > want) {
      const u = this.pursuit.pop();
      this.scene.remove(u.group);
    }
    if (this.wanted >= 3 && !this.heli) {
      this.heli = buildHelicopter();
      this.scene.add(this.heli.group);
    } else if (this.wanted < 3 && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
    this.pursuitActive = this.wanted > 0;
  }

  // Spawn a pursuit unit at a real road position ahead of the player.
  _placeUnit(unit, px, pz, idx) {
    const ahead = 26 + idx * 14;
    const lane = [-3.4, 3.4, -1.6][idx % 3];
    unit.setPose(px + lane, pz - ahead, 0);
    unit.group.visible = true;
  }

  update(dt, playerPos, playerSpeed) {
    // heat decays when the player is slow and out of sight
    if (this.wanted > 0 && playerSpeed < 3) this.heat = Math.max(0, this.heat - dt * 2.2);
    if (this.heat <= 0 && this.wanted > 0) this.setWanted(0);

    for (let i = 0; i < this.pursuit.length; i++) {
      const unit = this.pursuit[i];
      if (!unit.group.visible) this._placeUnit(unit, playerPos.x, playerPos.z, i);
      // simple pursuit: steer toward the player, match speed
      const dx = playerPos.x - unit.group.position.x;
      const dz = playerPos.z - unit.group.position.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(-dx, -dz);
      let dh = wantHeading - unit.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = clamp(dh * 2.2, -1, 1);
      const throttle = dist > 7 ? 1 : 0.25;
      unit.drive(dt, throttle, steer, false, 52);
      unit.group.position.y = 0;
      // respawn far units near the player again
      if (dist > 120) this._placeUnit(unit, playerPos.x, playerPos.z, i);
    }

    if (this.heli) {
      // helicopter orbits farther out, searchlight tracks the player
      this.heliAngle += dt * 0.22;
      const r = 34;
      const hx = playerPos.x + Math.cos(this.heliAngle) * r;
      const hz = playerPos.z + Math.sin(this.heliAngle) * r;
      this.heli.group.position.set(hx, 30, hz);
      this.heli.group.lookAt(playerPos.x, 0, playerPos.z);
      this.heli.rotor.rotation.y += dt * 22;
      this.heli.target.position.set(
        playerPos.x - hx, -30, playerPos.z - hz,
      );
    }
  }
}
