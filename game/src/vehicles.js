// Cars: the mesh factory (sedan, sports, truck, taxi, police — detailed
// bodies with glass cabins, protruding wheels with hubcaps, bumpers, lights
// and liveries), arcade driving physics, and the traffic that fills
// Solmar Bay's roads.

import * as THREE from 'three';
import { CAR, CITY } from './config.js';
import { collideCircle, nearestRoadPoint, onRoad } from './city.js';
import { range, pick } from './random.js';

export const CAR_TYPES = {
  sedan: { body: [4.4, 1.0, 2.0], cabin: [2.2, 0.75, 1.8], top: 1.35, speed: 1.0, name: 'Solmar Sedan' },
  sports: { body: [4.6, 0.8, 2.0], cabin: [2.0, 0.6, 1.7], top: 1.05, speed: 1.35, name: 'Cheetah GT' },
  truck: { body: [6.5, 1.4, 2.3], cabin: [1.8, 1.1, 2.2], top: 1.95, speed: 0.7, name: 'Harbor Hauler' },
  taxi: { body: [4.4, 1.0, 2.0], cabin: [2.2, 0.75, 1.8], top: 1.35, speed: 1.0, name: 'Bay Taxi' },
  police: { body: [4.5, 1.0, 2.0], cabin: [2.2, 0.75, 1.8], top: 1.35, speed: 1.45, name: 'SBPD Cruiser' },
  van: { body: [5.0, 1.7, 2.1], cabin: [1.6, 0.9, 2.0], top: 2.1, speed: 0.85, name: 'Bay Van' },
};

const PAINT = [0xc23b3b, 0x2b6cb0, 0xe8e8e8, 0x22262c, 0xd9a441, 0x3f7a5a, 0x7a4a9e, 0x9fb3c8, 0xc75b39, 0x4a7a8c, 0xf2a0b8, 0x8ad8b0];

// Small transparent label texture for door decals and roof signs.
function labelTexture(text, fg, w = 256, h = 96, font = 56) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.font = `900 ${font}px Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.strokeText(text, w / 2, h / 2 + 2);
  g.fillStyle = fg;
  g.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A visible driver: torso + head, so a stolen car never looks empty.
function driverFigure(r, shirt) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(r.geo.box, r.mat(shirt));
  torso.scale.set(0.55, 0.7, 0.35);
  torso.position.y = 0.75;
  g.add(torso);
  const head = new THREE.Mesh(r.geo.sph, r.mat(0xc9976b));
  head.scale.set(0.42, 0.42, 0.42);
  head.position.y = 1.35;
  g.add(head);
  const cap = new THREE.Mesh(r.geo.cyl, r.mat(0x22262c));
  cap.scale.set(0.46, 0.14, 0.46);
  cap.position.y = 1.56;
  g.add(cap);
  return g;
}

export function buildCarMesh(r, type, color, random) {
  const rnd = random ?? Math.random;
  const spec = CAR_TYPES[type];
  const g = new THREE.Group();
  const [L, BH, W] = spec.body;
  const [CL, CH, CW] = spec.cabin;
  const cabinX = type === 'truck' ? 2.2 : -0.2;
  // Glossy paint and glass: the car reads as a real car, not a toy block.
  const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 70, specular: 0x777777 });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x18242f, shininess: 110, specular: 0xaaccdd });
  const darkMat = r.mat(0x14171c);
  const chromeMat = new THREE.MeshPhongMaterial({ color: 0xcfd6da, shininess: 120, specular: 0xffffff });

  const body = new THREE.Mesh(r.geo.box, bodyMat);
  body.scale.set(L, BH, W);
  body.position.y = 0.75;
  body.castShadow = true;
  g.add(body);
  // Lower skirt + bumpers + grille give the body a real silhouette.
  const skirt = new THREE.Mesh(r.geo.box, darkMat);
  skirt.scale.set(L * 0.92, 0.22, W + 0.06);
  skirt.position.y = 0.32;
  g.add(skirt);
  for (const s of [1, -1]) {
    const bumper = new THREE.Mesh(r.geo.box, chromeMat);
    bumper.scale.set(0.3, 0.3, W + 0.08);
    bumper.position.set(s * (L / 2 - 0.02), 0.5, 0);
    g.add(bumper);
  }
  const grille = new THREE.Mesh(r.geo.box, darkMat);
  grille.scale.set(0.08, 0.34, 1.2);
  grille.position.set(L / 2 + 0.02, 0.78, 0);
  g.add(grille);

  const cabin = new THREE.Mesh(r.geo.box, glassMat);
  cabin.scale.set(CL, CH, CW);
  cabin.position.set(cabinX, spec.top, 0);
  cabin.castShadow = true;
  g.add(cabin);
  // Sloped windshield and rear glass so the cabin is not a flat slab.
  const shield = new THREE.Mesh(r.geo.box, glassMat);
  shield.scale.set(0.06, 0.85, CW - 0.1);
  shield.position.set(cabinX + CL / 2 + 0.28, spec.top - 0.12, 0);
  shield.rotation.z = 0.5;
  g.add(shield);
  const rearGlass = new THREE.Mesh(r.geo.box, glassMat);
  rearGlass.scale.set(0.06, 0.8, CW - 0.1);
  rearGlass.position.set(cabinX - CL / 2 - 0.28, spec.top - 0.12, 0);
  rearGlass.rotation.z = -0.5;
  g.add(rearGlass);
  // Side mirrors and a door shut-line down each flank.
  for (const s of [-1, 1]) {
    const mirror = new THREE.Mesh(r.geo.box, darkMat);
    mirror.scale.set(0.28, 0.14, 0.2);
    mirror.position.set(cabinX + CL / 2 - 0.1, spec.top - 0.15, s * (CW / 2 + 0.12));
    g.add(mirror);
    const seam = new THREE.Mesh(r.geo.box, darkMat);
    seam.scale.set(0.05, 0.55, 0.05);
    seam.position.set(0.35, 0.8, s * (W / 2 + 0.01));
    g.add(seam);
  }

  if (type === 'sports') {
    // Wing spoiler on two struts, a full-width tail-light bar, a hood scoop
    // and twin exhausts: the Cheetah GT looks fast standing still.
    for (const s of [-0.7, 0.7]) {
      const strut = new THREE.Mesh(r.geo.box, darkMat);
      strut.scale.set(0.14, 0.32, 0.14);
      strut.position.set(-2.15, 1.2, s);
      g.add(strut);
    }
    const wing = new THREE.Mesh(r.geo.box, darkMat);
    wing.scale.set(0.5, 0.1, 1.95);
    wing.position.set(-2.2, 1.4, 0);
    wing.castShadow = true;
    g.add(wing);
    const tailBar = new THREE.Mesh(r.geo.box, r.mat(0xff2a2a, { emissive: 0xff2a2a, emissiveIntensity: 1.6 }));
    tailBar.scale.set(0.12, 0.22, 1.9);
    tailBar.position.set(-L / 2 - 0.02, 0.85, 0);
    g.add(tailBar);
    const scoop = new THREE.Mesh(r.geo.box, darkMat);
    scoop.scale.set(0.7, 0.16, 0.9);
    scoop.position.set(1.5, 1.22, 0);
    g.add(scoop);
    for (const s of [-0.45, 0.45]) {
      const pipe = new THREE.Mesh(geoPipe(r), chromeMat);
      pipe.scale.set(1, 1, 1);
      pipe.position.set(-L / 2 - 0.1, 0.42, s);
      g.add(pipe);
    }
  }
  if (type === 'truck') {
    const cargo = new THREE.Mesh(r.geo.box, r.mat(0xe8e4da));
    cargo.scale.set(3.6, 1.9, 2.2);
    cargo.position.set(-1.3, 1.7, 0);
    cargo.castShadow = true;
    g.add(cargo);
    // Cargo ribs and rear doors.
    for (const rx of [-2.6, -1.3, 0]) {
      const rib = new THREE.Mesh(r.geo.box, r.mat(0xc8c4ba));
      rib.scale.set(0.12, 1.9, 2.24);
      rib.position.set(rx, 1.7, 0);
      g.add(rib);
    }
    const doorLine = new THREE.Mesh(r.geo.box, darkMat);
    doorLine.scale.set(0.06, 1.7, 0.1);
    doorLine.position.set(-3.12, 1.7, 0);
    g.add(doorLine);
  }
  if (type === 'van') {
    const band = new THREE.Mesh(r.geo.box, glassMat);
    band.scale.set(2.6, 0.55, W + 0.06);
    band.position.set(-0.6, 1.55, 0);
    g.add(band);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(r.geo.box, r.mat(0xffd166, { emissive: 0x8a5a00 }));
    sign.scale.set(0.8, 0.34, 0.5);
    sign.position.set(cabinX, spec.top + CH / 2 + 0.2, 0);
    g.add(sign);
    const taxiTex = labelTexture('TAXI', '#1a1a1a', 256, 96, 60);
    for (const s of [-1, 1]) {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.26),
        new THREE.MeshBasicMaterial({ map: taxiTex, transparent: true }),
      );
      label.position.set(cabinX, spec.top + CH / 2 + 0.2, s * 0.26);
      if (s < 0) label.rotation.y = Math.PI;
      g.add(label);
    }
  }
  if (type === 'police') {
    // Black-and-white livery: black hood and trunk panels over the white
    // body, a flashing light bar, and SBPD door decals.
    const hood = new THREE.Mesh(r.geo.box, r.mat(0x14171c));
    hood.scale.set(1.1, 0.1, W - 0.1);
    hood.position.set(L / 2 - 0.65, 0.75 + BH / 2 + 0.02, 0);
    g.add(hood);
    const trunkPanel = new THREE.Mesh(r.geo.box, r.mat(0x14171c));
    trunkPanel.scale.set(0.9, 0.1, W - 0.1);
    trunkPanel.position.set(-L / 2 + 0.55, 0.75 + BH / 2 + 0.02, 0);
    g.add(trunkPanel);
    const bar = new THREE.Mesh(r.geo.box, darkMat);
    bar.scale.set(0.5, 0.22, 1.5);
    bar.position.set(cabinX, spec.top + CH / 2 + 0.14, 0);
    g.add(bar);
    const red = new THREE.Mesh(r.geo.box, r.mat(0xff2222, { emissive: 0xff2222, emissiveIntensity: 2 }));
    red.scale.set(0.5, 0.2, 0.6);
    red.position.set(cabinX, spec.top + CH / 2 + 0.3, -0.45);
    g.add(red);
    const blue = new THREE.Mesh(r.geo.box, r.mat(0x2266ff, { emissive: 0x2266ff, emissiveIntensity: 2 }));
    blue.scale.set(0.5, 0.2, 0.6);
    blue.position.set(cabinX, spec.top + CH / 2 + 0.3, 0.45);
    g.add(blue);
    g.userData.lights = { red, blue };
    const stripe = new THREE.Mesh(r.geo.box, r.mat(0x14171c));
    stripe.scale.set(L, 0.35, W + 0.02);
    stripe.position.y = 0.8;
    g.add(stripe);
    const sbpdTex = labelTexture('SBPD', '#ffffff', 256, 96, 62);
    for (const s of [-1, 1]) {
      const decal = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.6),
        new THREE.MeshBasicMaterial({ map: sbpdTex, transparent: true }),
      );
      decal.position.set(-0.1, 0.82, s * (W / 2 + 0.03));
      if (s < 0) decal.rotation.y = Math.PI;
      g.add(decal);
    }
    // Red/blue light spilling onto the asphalt under the cruiser, flashing
    // with the light bar — the top-10 chase look.
    const glowGeo = new THREE.CircleGeometry(4.5, 20);
    glowGeo.rotateX(-Math.PI / 2);
    const glowRed = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
      color: 0xff2222, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glowRed.position.y = 0.07;
    g.add(glowRed);
    const glowBlue = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
      color: 0x2266ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glowBlue.position.y = 0.07;
    g.add(glowBlue);
    g.userData.glow = { red: glowRed, blue: glowBlue };
  }

  // Headlights and taillights, lit for the sunset hour.
  const hl = r.mat(0xfff2b0, { emissive: 0xffedb0, emissiveIntensity: 1.4 });
  const tl = r.mat(0xff2a2a, { emissive: 0xff2a2a, emissiveIntensity: 1.2 });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(r.geo.box, hl);
    h.scale.set(0.14, 0.3, 0.5);
    h.position.set(L / 2, 0.8, s * 0.68);
    g.add(h);
    if (type !== 'sports') {
      const t = new THREE.Mesh(r.geo.box, tl);
      t.scale.set(0.14, 0.3, 0.5);
      t.position.set(-L / 2, 0.8, s * 0.68);
      g.add(t);
    }
  }

  // Headlight beams: soft cones of light ahead of the car for the sunset hour.
  const beamGeo = new THREE.ConeGeometry(1.5, 9, 8, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.13,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (const s of [-1, 1]) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = Math.PI / 2; // apex at the headlight, base forward
    beam.position.set(L / 2 + 4.5, 0.8, s * 0.68);
    g.add(beam);
  }

  // Wheels that stick out past the bodywork, with bright hubcaps — the V1
  // wheels were swallowed by the body and the cars read as boxes.
  const wheels = [];
  const wheelR = type === 'truck' || type === 'van' ? 0.46 : 0.38;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.42, 14);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = r.mat(0x111214);
  const hubGeo = new THREE.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, 0.46, 10);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = chromeMat;
  const wx = L / 2 - 1.0;
  for (const [px, pz] of [[wx, W / 2 + 0.08], [wx, -W / 2 - 0.08], [-wx, W / 2 + 0.08], [-wx, -W / 2 - 0.08]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(px, wheelR, pz);
    w.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    w.add(hub);
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.driver = driverFigure(r, pick(rnd, [0x2b6cb0, 0xc23b3b, 0x3f7a5a, 0xd9a441]));
  g.userData.driver.scale.setScalar(0.8);
  g.userData.driver.position.set(type === 'truck' ? 2.2 : 0.1, 0.25, -0.4);
  g.add(g.userData.driver);
  return g;
}

// Short exhaust pipe: a cylinder pointing backwards (along -X).
function geoPipe(r) {
  const geo = new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

export function createVehicle(r, city, type, x, z, angle, color, random) {
  const rnd = random ?? Math.random;
  const mesh = buildCarMesh(r, type, color ?? pick(rnd, PAINT), rnd);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  r.scene.add(mesh);
  const spec = CAR_TYPES[type];
  return {
    mesh, type, spec,
    x, z, angle, speed: 0,
    color,
    radius: 2.4,
    health: 100,
    update(dt) {
      const forward = { x: Math.cos(this.angle), z: -Math.sin(this.angle) };
      this.x += forward.x * this.speed * dt;
      this.z += forward.z * this.speed * dt;
      const p = { x: this.x, z: this.z };
      collideCircle(city.colliders, p, this.radius);
      if (p.x !== this.x || p.z !== this.z) {
        this.x = p.x;
        this.z = p.z;
        this.speed *= 0.55;
      }
      this.mesh.position.set(this.x, 0, this.z);
      this.mesh.rotation.y = this.angle;
      // The wheel axle runs across the car (local Z), so spin is rotation.z.
      const spin = (this.speed * dt) / 0.38;
      for (const w of this.mesh.userData.wheels) w.rotation.z -= spin;
    },
    destroy() { r.scene.remove(this.mesh); },
  };
}

// Arcade driving: throttle, brake/reverse, steering that tightens at speed,
// handbrake for slides. `drive` in [-1,1], `steer` in [-1,1].
export function driveVehicle(v, drive, steer, handbrake, dt, upgrades = {}) {
  const maxSpeed = CAR.maxSpeed * v.spec.speed * (upgrades.engine ? 1.25 : 1);
  const accel = CAR.accel * (upgrades.engine ? 1.3 : 1);
  if (drive > 0) v.speed += accel * drive * dt;
  else if (drive < 0) {
    if (v.speed > 0.5) v.speed -= CAR.brake * dt;
    else v.speed = Math.max(v.speed + accel * 0.6 * drive * dt, -CAR.reverseMax);
  } else {
    v.speed -= v.speed * 0.6 * dt;
  }
  if (v.speed > maxSpeed) v.speed = maxSpeed;
  const grip = upgrades.tires ? CAR.grip * 1.3 : CAR.grip;
  const turnRate = (handbrake ? CAR.handbrakeTurn : CAR.turnRate) * (upgrades.tires ? 1.15 : 1);
  const speedFactor = Math.min(1, Math.abs(v.speed) / 12);
  v.angle += steer * turnRate * speedFactor * dt * (v.speed < 0 ? -1 : 1);
  if (handbrake) v.speed -= v.speed * 1.4 * dt;
  v.speed -= v.speed * (1 - grip / 10) * 0.12 * dt;
}

// Traffic: cars that cruise the road grid, turn at intersections, and brake
// for the car ahead. They respawn far from the player so the city always
// feels alive.
export function createTraffic(r, city, random, count = 16) {
  const cars = [];
  function spawnCar(farFrom) {
    const line = pick(random, city.roadLines);
    const along = range(random, -CITY.half + 20, CITY.half - 20);
    const horizontal = random() < 0.5;
    const x = horizontal ? along : line;
    const z = horizontal ? line : along;
    if (farFrom && Math.hypot(x - farFrom.x, z - farFrom.z) < 60) return null;
    const type = pick(random, ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'sports']);
    const angle = horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const v = createVehicle(r, city, type, x, z, angle, undefined, random);
    v.cruise = range(random, 10, 16);
    v.horizontal = horizontal;
    return v;
  }
  for (let i = 0; i < count; i += 1) {
    const v = spawnCar(null);
    if (v) cars.push(v);
  }

  return {
    cars,
    update(dt, playerPos, others = []) {
      for (const v of cars) {
        // At an intersection, sometimes turn onto the crossing road.
        const nearX = nearestRoadPoint(v.x, v.z);
        const atIntersection = Math.abs(v.x - Math.round(v.x / CITY.roadGap) * CITY.roadGap) < 3
          && Math.abs(v.z - Math.round(v.z / CITY.roadGap) * CITY.roadGap) < 3;
        if (atIntersection && random() < 0.006) {
          v.horizontal = !v.horizontal;
          v.angle = v.horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        }
        // Stay on the road: steer back toward the nearest road line.
        const target = v.horizontal ? nearX.z : nearX.x;
        const current = v.horizontal ? v.z : v.x;
        const off = target - current;
        const wantAngle = v.horizontal ? (Math.cos(v.angle) > 0 ? 0 : Math.PI) : (Math.sin(v.angle) > 0 ? -Math.PI / 2 : Math.PI / 2);
        let diff = wantAngle - v.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.angle += (diff * 2 + Math.max(-0.4, Math.min(0.4, off * 0.05)) * (v.horizontal ? Math.sign(Math.cos(v.angle)) || 1 : Math.sign(-Math.sin(v.angle)) || 1)) * dt;
        // Brake for the car ahead.
        let blocked = false;
        const fx = Math.cos(v.angle);
        const fz = -Math.sin(v.angle);
        for (const o of [...cars, ...others]) {
          if (o === v) continue;
          const dx = o.x - v.x;
          const dz = o.z - v.z;
          const ahead = dx * fx + dz * fz;
          const side = Math.abs(dx * -fz + dz * fx);
          if (ahead > 0 && ahead < 9 && side < 2.4) { blocked = true; break; }
        }
        v.speed += ((blocked ? 0 : v.cruise) - v.speed) * Math.min(1, 2 * dt);
        v.update(dt);
        // Respawn far away if it drifted off or got stuck.
        if (Math.hypot(v.x - playerPos.x, v.z - playerPos.z) > 260 || (!onRoad(v.x, v.z) && Math.hypot(v.x - playerPos.x, v.z - playerPos.z) > 80)) {
          const nv = spawnCar(playerPos);
          if (nv) {
            v.destroy();
            Object.assign(v, nv);
          }
        }
      }
    },
  };
}
