// Wanted system + police pursuit + helicopter with a visible spotlight cone.
import * as THREE from 'three';
import { makePoliceCar, updatePoliceLights } from './vehicles.js';
import { makeGlow, lightPool, clamp } from './util.js';

const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 4', 'UNIT 9'];
const STATUSES = ['RAMMING', 'CLOSING IN', 'PURSUIT', 'ROADBLOCK', 'OVERHEAD SPOTLIGHT'];

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.heli = null;
    this.heliLight = null;
    this.spotCone = null;
    this.roadblock = null;
    this.t = 0;
  }

  desiredCount(wanted) {
    return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : wanted <= 4 ? 4 : 5;
  }

  syncCount(wanted, heroPos) {
    const want = this.desiredCount(wanted);
    while (this.cars.length < want) {
      const car = makePoliceCar();
      const i = this.cars.length;
      const side = i % 2 === 0 ? -1 : 1;
      car.position.set(heroPos.x + side * (6 + i * 4), 0, heroPos.z - 18 - i * 14);
      car.rotation.y = Math.PI;
      this.scene.add(car);
      this.cars.push({ mesh: car, speed: 0, ramTimer: 0, name: UNIT_NAMES[i % UNIT_NAMES.length], status: STATUSES[i % 3], dist: 0 });
    }
    while (this.cars.length > want) {
      const c = this.cars.pop();
      this.scene.remove(c.mesh);
    }
    // helicopter at 3+ stars
    if (wanted >= 3 && !this.heli) this.spawnHeli(heroPos);
    if (wanted < 3 && this.heli) {
      this.scene.remove(this.heli);
      this.scene.remove(this.spotCone);
      this.heli = null; this.spotCone = null;
    }
    // roadblock at 4+ stars
    if (wanted >= 4 && !this.roadblock) this.spawnRoadblock(heroPos);
    if (wanted < 4 && this.roadblock) {
      this.scene.remove(this.roadblock);
      this.roadblock = null;
    }
  }

  spawnHeli(heroPos) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.5), bodyMat);
    body.position.y = 0;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.4), bodyMat);
    tail.position.set(0, 0.2, -3.6);
    g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    rotor.position.y = 0.9;
    rotor.name = 'rotor';
    g.add(rotor);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(0, -0.9, 1.6);
    g.add(lamp);
    const glow = makeGlow(0xffffff, 6, 0.9);
    glow.position.set(0, -0.9, 1.6);
    g.add(glow);
    g.position.set(heroPos.x + 14, 34, heroPos.z - 26);
    this.scene.add(g);
    this.heli = g;
    // spotlight cone: wide, bright, clearly visible against the night
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 34, 16, 1, true), coneMat);
    cone.position.set(0, -17, 0);
    cone.rotation.x = Math.PI;
    g.add(cone);
    this.spotCone = cone;
    const spot = new THREE.SpotLight(0xfff6c8, 220, 60, 0.32, 0.4, 1.2);
    spot.position.set(0, -1, 1.6);
    spot.target.position.set(0, -34, 4);
    g.add(spot, spot.target);
    this.heliLight = spot;
    const pool = lightPool(0xfff6c8, 7, 0.5);
    pool.position.set(0, 0.05, 0);
    pool.name = 'helipool';
    this.scene.add(pool);
    this.heliPool = pool;
  }

  spawnRoadblock(heroPos) {
    const g = new THREE.Group();
    for (const x of [-6, 0, 6]) {
      const car = makePoliceCar();
      car.position.set(x, 0, 0);
      car.rotation.y = Math.PI / 2;
      g.add(car);
    }
    g.position.set(0, 0, heroPos.z - 90);
    this.scene.add(g);
    this.roadblock = g;
  }

  // Simple pursuit: chase the hero, ram when close. Returns nearest distance.
  update(dt, heroPos, heroSpeed, wanted) {
    this.t += dt;
    this.syncCount(wanted, heroPos);
    let nearest = 999;
    for (const c of this.cars) {
      const dx = heroPos.x - c.mesh.position.x;
      const dz = heroPos.z - c.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      c.dist = dist;
      nearest = Math.min(nearest, dist);
      const targetSpeed = wanted >= 4 ? 46 : 38;
      c.speed = THREE.MathUtils.lerp(c.speed, targetSpeed, dt * 0.8);
      const dirX = dx / (dist || 1);
      const dirZ = dz / (dist || 1);
      // steer toward the hero with a slight weave
      const weave = Math.sin(this.t * 1.4 + c.mesh.position.x) * 0.25;
      c.mesh.position.x += (dirX + weave * 0.2) * c.speed * dt;
      c.mesh.position.z += dirZ * c.speed * dt;
      c.mesh.rotation.y = Math.atan2(dirX, dirZ);
      c.ramTimer -= dt;
      if (dist < 4 && c.ramTimer <= 0) {
        c.ramTimer = 2.5;
        c.status = 'RAMMING';
      } else if (dist < 25) {
        c.status = 'CLOSING IN';
      } else {
        c.status = 'PURSUIT';
      }
      updatePoliceLights(c.mesh, this.t);
    }
    if (this.heli) {
      // hover above and slightly ahead of the hero, sweeping the spotlight
      const hx = heroPos.x + Math.sin(this.t * 0.4) * 10;
      const hz = heroPos.z - 24 + Math.cos(this.t * 0.3) * 6;
      this.heli.position.x = THREE.MathUtils.lerp(this.heli.position.x, hx, dt * 0.7);
      this.heli.position.z = THREE.MathUtils.lerp(this.heli.position.z, hz, dt * 0.7);
      const rotor = this.heli.getObjectByName('rotor');
      if (rotor) rotor.rotation.y += dt * 22;
      if (this.heliPool) {
        this.heliPool.position.set(this.heli.position.x, 0.05, this.heli.position.z + 4);
      }
    }
    return nearest;
  }

  rowsForHud() {
    const rows = this.cars.slice(0, 3).map((c) => ({ name: c.name, status: c.status, dist: `${Math.round(c.dist)}m` }));
    if (this.heli) rows.push({ name: 'AIR-1', status: 'OVERHEAD SPOTLIGHT', dist: '—' });
    return rows;
  }

  // Stage the cover shot: 2 cruisers ahead of the hero, lights blazing.
  stageCover(heroPos) {
    this.syncCount(3, heroPos);
    const spots = [
      { x: heroPos.x + 6, z: heroPos.z - 14 },
      { x: heroPos.x - 2, z: heroPos.z - 26 },
      { x: heroPos.x - 8, z: heroPos.z - 44 },
    ];
    this.cars.forEach((c, i) => {
      const s = spots[i % spots.length];
      c.mesh.position.set(s.x, 0, s.z);
      c.mesh.rotation.y = Math.PI;
      c.status = i === 0 ? 'RAMMING' : 'CLOSING IN';
      c.dist = 9 + i * 21;
    });
    if (this.heli) {
      this.heli.position.set(heroPos.x + 12, 34, heroPos.z - 30);
    }
  }
}
