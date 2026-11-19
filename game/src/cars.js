// Cars: extruded side-profile bodies (NOT boxy), headlights on the nose,
// taillight bar + spoiler on the tail, wheels, police light bars, traffic AI.
//
// Car local space: NOSE faces -Z, TAIL faces +Z. The body shape is drawn in
// 2D with the nose at +x, then the body mesh is rotated y = PI/2 so +x maps
// to -Z. Every light is placed in group space after that rotation, so the
// headlights are provably on the nose end and the taillight bar on the tail.

import { clamp, glowTexture } from './utils.js';

function sportProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.2, 0.30);
  s.lineTo(-2.2, 0.66);
  s.lineTo(-1.85, 0.74);
  s.lineTo(-1.05, 0.98);
  s.lineTo(-0.15, 1.04);
  s.lineTo(0.65, 0.90);
  s.lineTo(1.55, 0.64);
  s.lineTo(2.12, 0.58);
  s.lineTo(2.2, 0.42);
  s.lineTo(2.2, 0.30);
  s.closePath();
  return s;
}

function sedanProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.25, 0.30);
  s.lineTo(-2.25, 0.72);
  s.lineTo(-1.7, 0.80);
  s.lineTo(-1.15, 1.14);
  s.lineTo(0.55, 1.14);
  s.lineTo(1.15, 0.80);
  s.lineTo(1.9, 0.70);
  s.lineTo(2.25, 0.62);
  s.lineTo(2.25, 0.30);
  s.closePath();
  return s;
}

function vanProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.30);
  s.lineTo(-2.3, 1.5);
  s.lineTo(1.1, 1.5);
  s.lineTo(1.7, 1.05);
  s.lineTo(2.3, 0.85);
  s.lineTo(2.3, 0.30);
  s.closePath();
  return s;
}

function bodyMesh(profile, color, width = 1.72) {
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width, steps: 1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2,
  });
  geo.translate(0, 0, -width / 2);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.28, metalness: 0.65,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = Math.PI / 2; // shape +x (nose) -> group -Z
  return mesh;
}

function glowSprite(color, scale) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale, scale, 1);
  return s;
}

export class Car {
  constructor({ profile = 'sport', color = 0xe62129, name = 'CAR', police = false, withHeadlight = false } = {}) {
    this.name = name;
    this.police = police;
    this.speed = 0; // m/s, signed
    this.heading = 0;
    this.steer = 0;
    this.group = new THREE.Group();

    const shape = profile === 'sedan' ? sedanProfile() : profile === 'van' ? vanProfile() : sportProfile();
    this.group.add(bodyMesh(shape, color, profile === 'van' ? 1.9 : 1.72));

    // glass cabin (dark, glossy) — sits slightly tail-side on the fastback roof
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.34, profile === 'van' ? 2.6 : 1.7),
      new THREE.MeshStandardMaterial({ color: 0x0a0e18, roughness: 0.06, metalness: 0.9 }),
    );
    glass.position.set(0, profile === 'van' ? 1.55 : 1.02, profile === 'van' ? 0 : 0.12);
    this.group.add(glass);

    // wheels: cylinder axis along X
    const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 });
    const hub = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, roughness: 0.3, metalness: 0.9 });
    this.wheels = [];
    for (const [wx, wz] of [[-0.84, -1.32], [0.84, -1.32], [-0.84, 1.32], [0.84, 1.32]]) {
      const wg = new THREE.Group();
      const tyreM = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 14), tyre);
      tyreM.rotation.z = Math.PI / 2;
      wg.add(tyreM);
      const hubM = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 10), hub);
      hubM.rotation.z = Math.PI / 2;
      wg.add(hubM);
      wg.position.set(wx, 0.34, wz);
      this.group.add(wg);
      this.wheels.push(wg);
    }

    // ---- NOSE (-Z): headlights + spotlight ----
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
    for (const hx of [-0.56, 0.56]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.08), headMat);
      h.position.set(hx, 0.56, -2.24);
      this.group.add(h);
      const gs = glowSprite('#fff2c0', 1.6);
      gs.position.set(hx, 0.56, -2.4);
      this.group.add(gs);
    }
    if (withHeadlight) {
      const spot = new THREE.SpotLight(0xfff2c0, 180, 42, 0.5, 0.55, 1.4);
      spot.position.set(0, 0.7, -2.2);
      const target = new THREE.Object3D();
      target.position.set(0, 0, -22);
      this.group.add(target);
      spot.target = target;
      this.group.add(spot);
      this.headSpot = spot;
    }

    // ---- TAIL (+Z): full-width taillight bar + spoiler ----
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.1, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    );
    tail.position.set(0, 0.62, 2.24);
    this.group.add(tail);
    const tailGlow = glowSprite('#ff2222', 2.6);
    tailGlow.position.set(0, 0.62, 2.45);
    this.group.add(tailGlow);
    if (profile === 'sport') {
      const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.35, metalness: 0.6 });
      for (const sx of [-0.6, 0.6]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.12), spoilerMat);
        strut.position.set(sx, 0.82, 2.0);
        this.group.add(strut);
      }
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.06, 0.5), spoilerMat);
      wing.position.set(0, 0.99, 2.02);
      wing.rotation.x = -0.12;
      this.group.add(wing);
    }

    // side mirrors
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0.6 });
    for (const mx of [-0.95, 0.95]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.22), mirrorMat);
      m.position.set(mx, 0.86, -0.55);
      this.group.add(m);
    }

    if (police) this._addPoliceGear();
  }

  _addPoliceGear() {
    // white roof + white doors read as a police unit at a glance
    const white = new THREE.MeshStandardMaterial({ color: 0xe8eaf0, roughness: 0.35, metalness: 0.4 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 1.9), white);
    roof.position.set(0, 1.1, 0.05);
    this.group.add(roof);
    // light bar: red left, blue right
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.09, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4 }),
    );
    bar.position.set(0, 1.18, 0.05);
    this.group.add(bar);
    this.redLens = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.13, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    this.redLens.position.set(-0.33, 1.26, 0.05);
    this.group.add(this.redLens);
    this.blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.13, 0.3), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    this.blueLens.position.set(0.33, 1.26, 0.05);
    this.group.add(this.blueLens);
    this.redGlow = glowSprite('#ff2222', 3.2);
    this.redGlow.position.set(-0.33, 1.3, 0.05);
    this.group.add(this.redGlow);
    this.blueGlow = glowSprite('#2266ff', 3.2);
    this.blueGlow.position.set(0.33, 1.3, 0.05);
    this.group.add(this.blueGlow);
    // alternating point lights (the red/blue pools on the wet road)
    this.redLight = new THREE.PointLight(0xff2222, 0, 16, 1.6);
    this.redLight.position.set(-0.4, 1.6, 0.1);
    this.group.add(this.redLight);
    this.blueLight = new THREE.PointLight(0x2266ff, 0, 16, 1.6);
    this.blueLight.position.set(0.4, 1.6, 0.1);
    this.group.add(this.blueLight);
    this.blinkPhase = Math.random() * Math.PI * 2;
  }

  // Place the car at its position AND rotation immediately (never at origin).
  setPose(x, z, heading) {
    this.heading = heading;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = heading;
  }

  forward() {
    return { x: -Math.sin(this.heading), z: -Math.cos(this.heading) };
  }

  // Arcade driving: throttle -1..1, steerInput -1..1, handbrake bool.
  drive(dt, throttle, steerInput, handbrake, topSpeed = 60) {
    const accel = 26;
    this.speed += throttle * accel * dt;
    this.speed -= this.speed * (handbrake ? 1.6 : 0.35) * dt;
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    this.speed = clamp(this.speed, -12, topSpeed);
    const turnRate = 1.9 * clamp(Math.abs(this.speed) / 14, 0, 1) * (this.speed < 0 ? -1 : 1);
    this.heading += steerInput * turnRate * dt * (handbrake ? 1.5 : 1);
    const f = this.forward();
    this.group.position.x += f.x * this.speed * dt;
    this.group.position.z += f.z * this.speed * dt;
    this.group.rotation.y = this.heading;
    // body lean + wheel spin
    const targetRoll = -steerInput * clamp(Math.abs(this.speed) / 30, 0, 1) * 0.05;
    this.group.rotation.z += (targetRoll - this.group.rotation.z) * Math.min(1, dt * 6);
    for (const w of this.wheels) w.rotation.x += (this.speed / 0.34) * dt;
    if (this.police) this._blink(dt);
  }

  _blink(dt) {
    this.blinkPhase += dt * 9;
    const on = Math.sin(this.blinkPhase) > 0;
    // stay bright at capture: minimum 0.75 of full intensity
    const hi = 26, lo = 20;
    this.redLight.intensity = on ? hi : lo * 0.25;
    this.blueLight.intensity = on ? lo * 0.25 : hi;
    this.redGlow.material.opacity = on ? 1 : 0.75;
    this.blueGlow.material.opacity = on ? 0.75 : 1;
  }

  // Keep the lights at a fixed bright phase for frozen screenshots.
  freezeBlink() {
    if (!this.police) return;
    this.redLight.intensity = 24;
    this.blueLight.intensity = 24;
    this.redGlow.material.opacity = 1;
    this.blueGlow.material.opacity = 1;
  }
}

// Simple lane traffic: cars cruise the avenue + cross streets and wrap around.
export function buildTraffic(scene, count = 10) {
  const rnd = Math.random;
  const defs = [
    { name: 'KOBALT GT', color: 0x2a6cff, profile: 'sport' },
    { name: 'STRATA X', color: 0xc8ccd4, profile: 'sedan' },
    { name: 'MARLIN SEDAN', color: 0x3fae6a, profile: 'sedan' },
    { name: 'ORCA SUV', color: 0x8a5cff, profile: 'van' },
    { name: 'PELICAN VAN', color: 0xd8a13c, profile: 'van' },
    { name: 'FALCO COUPE', color: 0x37c8c0, profile: 'sport' },
  ];
  const cars = [];
  for (let i = 0; i < count; i++) {
    const d = defs[i % defs.length];
    const car = new Car({ profile: d.profile, color: d.color, name: d.name });
    const onCross = i % 3 === 2;
    let x, z, heading, lane;
    if (onCross) {
      lane = [-40, -90, -140, -190][i % 4];
      z = lane + (rnd() < 0.5 ? -2.4 : 2.4);
      x = -55 + rnd() * 110;
      heading = z > lane ? Math.PI / 2 : -Math.PI / 2; // east/west along X
    } else {
      lane = [-5.2, -1.8, 1.8, 5.2][i % 4];
      x = lane;
      z = 50 - rnd() * 280;
      heading = lane < 0 ? 0 : Math.PI; // left lanes head north (-Z), right lanes south
    }
    car.setPose(x, z, heading);
    car.cruise = 8 + rnd() * 5;
    car.onCross = onCross;
    car.lane = lane;
    scene.add(car.group);
    cars.push(car);
  }
  return {
    cars,
    update(dt) {
      for (const car of cars) {
        // slow down if another car is close ahead in the same lane
        let target = car.cruise;
        for (const other of cars) {
          if (other === car || other.onCross !== car.onCross) continue;
          const dx = other.group.position.x - car.group.position.x;
          const dz = other.group.position.z - car.group.position.z;
          const f = car.forward();
          const ahead = dx * f.x + dz * f.z;
          const side = Math.abs(dx * f.z - dz * f.x);
          if (ahead > 0 && ahead < 9 && side < 2.2) { target = Math.min(target, 2.5); break; }
        }
        car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
        const f = car.forward();
        car.group.position.x += f.x * car.speed * dt;
        car.group.position.z += f.z * car.speed * dt;
        for (const w of car.wheels) w.rotation.x += (car.speed / 0.34) * dt;
        // wrap around the city
        const p = car.group.position;
        if (!car.onCross) {
          if (p.z < -250) p.z = 60;
          if (p.z > 70) p.z = -240;
        } else {
          if (p.x < -60) p.x = 58;
          if (p.x > 60) p.x = -58;
        }
      }
    },
  };
}
