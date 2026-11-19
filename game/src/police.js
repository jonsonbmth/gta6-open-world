// Wanted system + police pursuit + AIR-1 helicopter for SOLMAR BAY.
// Wanted 0–5 stars. setWanted() sets the heat value that drives how many
// units hunt the player. Named units (UNIT 7, UNIT 12, UNIT 21) chase with
// simple steering; at 3+ stars AIR-1 joins, orbiting above with a NARROW,
// faint searchlight cone (radius ~2.4 m, opacity ~0.06, FrontSide only — a
// wide DoubleSide cone rendered as a giant white blob in V9).
import * as THREE from 'three';
import { makePoliceCar, placeCar } from './cars.js';
import { makeGlowSprite } from './world.js';
import { clamp, TAU } from './util.js';

const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 4', 'UNIT 9'];

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.wanted = 0;
    this.heat = 0; // 0..1 pursuit intensity, set by setWanted
    this.units = [];
    this.heli = null;
    this.heliAngle = 0;
    this._unitCounter = 0;
  }

  setWanted(n) {
    this.wanted = clamp(Math.round(n), 0, 5);
    this.heat = this.wanted / 5; // setWanted sets heat (V8 fix)
    this._syncUnits();
  }

  addWanted(n) {
    this.setWanted(this.wanted + n);
  }

  _syncUnits() {
    const want = this.wanted === 0 ? 0 : Math.min(1 + Math.floor(this.wanted / 2), 3);
    while (this.units.length < want) this._spawnUnit();
    while (this.units.length > want) {
      const u = this.units.pop();
      this.scene.remove(u.group);
    }
    if (this.wanted >= 3 && !this.heli) this._spawnHeli();
    if (this.wanted < 3 && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
  }

  _spawnUnit() {
    const group = makePoliceCar();
    const name = UNIT_NAMES[this._unitCounter % UNIT_NAMES.length];
    this._unitCounter++;
    group.userData.name = name;
    // Spawn off-screen-ish, ahead of the player on the avenue.
    placeCar(group, (Math.random() - 0.5) * 10, -90 + this.units.length * 30, 0);
    this.scene.add(group);
    this.units.push({ group, name, speed: 0 });
  }

  _spawnHeli() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22242e, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.6, 6, 12), bodyMat);
    body.rotation.z = Math.PI / 2;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 3.4), bodyMat);
    tail.position.set(0, 0.2, -2.6);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.06, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    rotor.position.y = 0.9;
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    tailRotor.position.set(0.2, 0.3, -4.1);
    // NARROW faint searchlight cone: radius 2.4, opacity 0.06, FrontSide.
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff6c8, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 24, 20, 1, true), coneMat);
    cone.position.y = -12;
    cone.rotation.x = Math.PI; // apex up at the heli, base down
    const lamp = makeGlowSprite(0xfff2c0, 2.2, 0.8);
    lamp.position.set(0, -0.6, 1.6);
    group.add(body, tail, rotor, tailRotor, cone, lamp);
    group.position.set(0, 26, 0);
    this.scene.add(group);
    this.heli = { group, rotor, tailRotor, cone, angle: 0 };
  }

  update(dt, t, heroPos, heroHeading, heroSpeed) {
    // Alternate the light bars: red/blue swap every ~0.4 s.
    const phase = Math.floor(t / 0.4) % 2 === 0;
    for (const u of this.units) {
      const g = u.group;
      const ud = g.userData;
      ud.redGlow.material.opacity = phase ? 0.95 : 0.25;
      ud.blueGlow.material.opacity = phase ? 0.25 : 0.95;
      ud.redPool.material.opacity = phase ? 0.3 : 0.1;
      ud.bluePool.material.opacity = phase ? 0.1 : 0.3;
      // Simple pursuit steering toward the hero.
      const dx = heroPos.x - g.position.x;
      const dz = heroPos.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - g.rotation.y;
      while (dh > Math.PI) dh -= TAU;
      while (dh < -Math.PI) dh += TAU;
      g.rotation.y += clamp(dh, -1.6 * dt, 1.6 * dt);
      const targetSpeed = dist > 4 ? 26 + this.heat * 8 : 0;
      u.speed += (targetSpeed - u.speed) * Math.min(1, dt * 1.5);
      g.position.x += Math.sin(g.rotation.y) * u.speed * dt;
      g.position.z += Math.cos(g.rotation.y) * u.speed * dt;
    }

    if (this.heli) {
      const h = this.heli;
      h.angle += dt * 0.25;
      // Orbit farther out (V6 fix), above and around the hero.
      const r = 30;
      h.group.position.set(
        heroPos.x + Math.cos(h.angle) * r,
        26,
        heroPos.z + Math.sin(h.angle) * r,
      );
      h.group.lookAt(heroPos.x, 0, heroPos.z);
      h.rotor.rotation.y += dt * 30;
      h.tailRotor.rotation.x += dt * 30;
      // Aim the cone at the hero: tilt the cone group toward the target.
      h.cone.lookAt(heroPos.x - h.group.position.x, -26, heroPos.z - h.group.position.z);
    }
  }
}
