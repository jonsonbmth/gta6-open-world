// People: the humanoid mesh factory (head, torso, arms, legs, all boxes and
// spheres) and the pedestrians who walk Solmar Bay's sidewalks, chat, and run
// when a car comes at them or a shot rings out.

import * as THREE from 'three';
import { CITY } from './config.js';
import { collideCircle, nearestRoadPoint } from './city.js';
import { range, pick } from './random.js';

const SHIRTS = [0xe8e8e8, 0x2b6cb0, 0xc23b3b, 0x3f7a5a, 0xd9a441, 0x7a4a9e, 0x4a7a8c, 0xe87a9e];
const PANTS = [0x2c3a4a, 0x3a3f46, 0x5a4632, 0x1f2a33];
const SKINS = [0xc9976b, 0x8a5a3a, 0xe8b88a, 0x6b4423, 0xd9a077];

export function buildPersonMesh(r, opts = {}) {
  const shirt = opts.shirt ?? pick(Math.random, SHIRTS);
  const pants = opts.pants ?? pick(Math.random, PANTS);
  const skin = opts.skin ?? pick(Math.random, SKINS);
  const g = new THREE.Group();
  const torso = new THREE.Mesh(r.geo.box, r.mat(shirt));
  torso.scale.set(0.62, 0.78, 0.34);
  torso.position.y = 1.12;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(r.geo.sph, r.mat(skin));
  head.scale.set(0.44, 0.46, 0.44);
  head.position.y = 1.78;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(r.geo.sph, r.mat(opts.hair ?? 0x22262c));
  hair.scale.set(0.46, 0.3, 0.46);
  hair.position.y = 1.94;
  g.add(hair);
  // Headwear variety: caps and sun hats so the crowd is not clones.
  // (Rico passes hat: false — the protagonist keeps his own look.)
  const hatRoll = Math.random();
  if (opts.hat !== false && hatRoll < 0.3) {
    const cap = new THREE.Mesh(r.geo.cyl, r.mat(pick(Math.random, [0xc23b3b, 0x2b6cb0, 0xd9a441, 0x22262c])));
    cap.scale.set(0.48, 0.16, 0.48);
    cap.position.y = 2.02;
    g.add(cap);
    const brim = new THREE.Mesh(r.geo.box, r.mat(0x22262c));
    brim.scale.set(0.4, 0.05, 0.3);
    brim.position.set(0, 1.98, 0.28);
    g.add(brim);
  } else if (opts.hat !== false && hatRoll < 0.45) {
    const hat = new THREE.Mesh(r.geo.cyl, r.mat(0xd9c1a7));
    hat.scale.set(0.85, 0.08, 0.85);
    hat.position.y = 2.0;
    g.add(hat);
    const crown = new THREE.Mesh(r.geo.sph, r.mat(0xd9c1a7));
    crown.scale.set(0.4, 0.3, 0.4);
    crown.position.y = 2.06;
    g.add(crown);
  }
  const arms = [];
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(r.geo.box, r.mat(pants));
    leg.scale.set(0.24, 0.72, 0.28);
    leg.position.set(s * 0.17, 0.36, 0);
    leg.castShadow = true;
    g.add(leg);
    legs.push(leg);
    const arm = new THREE.Mesh(r.geo.box, r.mat(shirt));
    arm.scale.set(0.2, 0.66, 0.24);
    arm.position.set(s * 0.42, 1.12, 0);
    g.add(arm);
    arms.push(arm);
  }
  g.userData.legs = [legs[0], arms[0], legs[1], arms[1]];
  g.userData.arms = arms;
  g.userData.walkPhase = Math.random() * Math.PI * 2;
  return g;
}

// Walk-cycle bob: legs swing, body bobs, arms counter-swing.
export function animateWalk(mesh, dt, speed) {
  const u = mesh.userData;
  u.walkPhase += dt * (4 + speed * 0.9);
  const s = Math.sin(u.walkPhase) * Math.min(1, speed / 4) * 0.55;
  const [legL, armL, legR, armR] = u.legs;
  legL.rotation.x = s;
  legR.rotation.x = -s;
  armL.rotation.x = -s * 0.8;
  armR.rotation.x = s * 0.8;
  mesh.position.y = Math.abs(Math.sin(u.walkPhase)) * 0.05 * Math.min(1, speed / 4);
}

export function createPedestrians(r, city, random, count = 26) {
  const peds = [];
  function makePed(x, z) {
    const mesh = buildPersonMesh(r);
    mesh.position.set(x, 0, z);
    r.scene.add(mesh);
    return {
      mesh, x, z,
      angle: random() * Math.PI * 2,
      speed: range(random, 1.2, 2.2),
      state: 'walk', // walk | flee | down
      downTimer: 0,
      wanderTimer: range(random, 3, 9),
      update(dt, threats) {
        if (this.state === 'down') {
          this.downTimer -= dt;
          if (this.downTimer <= 0) {
            this.state = 'flee';
            this.mesh.rotation.x = 0;
            this.mesh.position.y = 0;
          }
          return;
        }
        let fleeing = this.state === 'flee';
        for (const t of threats) {
          const d = Math.hypot(this.x - t.x, this.z - t.z);
          if (d < t.radius) fleeing = true;
        }
        if (fleeing) {
          this.state = 'flee';
          const t = threats[0];
          // Arms up: a fleeing crowd reads as panic, not a stroll.
          const [armL, armR] = this.mesh.userData.arms ?? [];
          if (armL) armL.rotation.z = 2.4;
          if (armR) armR.rotation.z = -2.4;
          if (t) {
            const away = Math.atan2(-(this.z - t.z), this.x - t.x);
            this.angle = away;
          }
          const sp = 6.5;
          this.x += Math.cos(this.angle) * sp * dt;
          this.z += -Math.sin(this.angle) * sp * dt;
          animateWalk(this.mesh, dt, sp);
          if (t && Math.hypot(this.x - t.x, this.z - t.z) > 60) this.state = 'walk';
        } else {
          const [armL, armR] = this.mesh.userData.arms ?? [];
          if (armL) armL.rotation.z = 0;
          if (armR) armR.rotation.z = 0;
          this.wanderTimer -= dt;
          if (this.wanderTimer <= 0) {
            this.wanderTimer = range(random, 3, 9);
            // Keep to sidewalks: pick a nearby road and walk along it.
            const near = nearestRoadPoint(this.x, this.z);
            this.angle = near.axis === 'x' ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
          }
          this.x += Math.cos(this.angle) * this.speed * dt;
          this.z += -Math.sin(this.angle) * this.speed * dt;
          animateWalk(this.mesh, dt, this.speed);
        }
        const p = { x: this.x, z: this.z };
        collideCircle(city.colliders, p, 0.6);
        this.x = p.x;
        this.z = p.z;
        this.mesh.position.set(this.x, this.mesh.position.y, this.z);
        this.mesh.rotation.y = this.angle;
      },
      knockDown() {
        if (this.state === 'down') return;
        this.state = 'down';
        this.downTimer = 4;
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.4;
      },
    };
  }
  function spawnPed(farFrom) {
    // Sidewalks: just off a road line, inside a block edge.
    const line = pick(random, city.roadLines);
    const along = range(random, -CITY.half + 20, CITY.half - 20);
    const horizontal = random() < 0.5;
    const off = (random() < 0.5 ? -1 : 1) * (CITY.roadWidth / 2 + 3);
    const x = horizontal ? along : line + off;
    const z = horizontal ? line + off : along;
    if (farFrom && Math.hypot(x - farFrom.x, z - farFrom.z) < 40) return null;
    return makePed(x, z);
  }
  for (let i = 0; i < count; i += 1) {
    const p = spawnPed(null);
    if (p) peds.push(p);
  }

  return {
    peds,
    // Staging helper: drop extra people around a spot (the marina foot shot).
    spawnNear(x, z, n) {
      const made = [];
      for (let i = 0; i < n; i += 1) {
        const p = makePed(x + range(random, -14, 14), z + range(random, -10, 10));
        peds.push(p);
        made.push(p);
      }
      return made;
    },
    update(dt, playerPos, danger) {
      const threats = [];
      if (danger) threats.push(danger);
      for (const p of peds) {
        p.update(dt, threats);
        if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) > 220) {
          const np = spawnPed(playerPos);
          if (np) {
            r.scene.remove(p.mesh);
            Object.assign(p, np);
          }
        }
      }
    },
  };
}
