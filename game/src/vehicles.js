// Vehicles: rounded cars (ellipsoid bodies — never boxes) and the police
// helicopter with its big visible spotlight cone. The heli cone is a
// signature top-10 element: a wide additive cone from the heli to the
// ground plus a bright pool, tracking the player.

import { glowSprite } from './util.js';

function roundedBody(color, roughness) {
  return new THREE.MeshStandardMaterial({
    color, roughness: roughness == null ? 0.32 : roughness, metalness: 0.55,
  });
}

// Hero paint: clearcoat car paint (MeshPhysicalMaterial) — a glossy
// lacquer layer over the base colour, so the sunset env map gives it a
// wet showroom reflection instead of flat plastic.
function heroPaint(color) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.6, roughness: 0.3,
    clearcoat: 1, clearcoatRoughness: 0.08,
  });
}

function glassMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x0e1a26, roughness: 0.12, metalness: 0.9,
  });
}

// A car from spheres and capsules only: ellipsoid body, ellipsoid glass
// cabin, cylinder wheels with sphere hubcaps, glowing headlights (dusk).
export function makeCar(opts) {
  const o = opts || {};
  const color = o.color == null ? 0xd94f30 : o.color;
  const police = !!o.police;
  const g = new THREE.Group();
  const wheels = [];

  const bodyMat = o.hero ? heroPaint(color)
    : roundedBody(police ? 0xf2f0ea : color, police ? 0.4 : 0.3);
  // Low sleek wedge (sports-car proportions): the body sits 0.06 lower and
  // 0.08 flatter than the first pass, with a longer nose — the top-3
  // heroes all read LONG and LOW, never tall and blobby.
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bodyMat);
  body.scale.set(1.04, 0.38, 2.35);
  body.position.y = 0.56;
  body.castShadow = true;
  g.add(body);

  // Lower skirt: a darker flattened ellipsoid so the car sits planted.
  const skirt = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 }),
  );
  skirt.scale.set(1.0, 0.3, 2.2);
  skirt.position.y = 0.38;
  g.add(skirt);

  // Cabin: dark glass ellipsoid, swept back, lower and flatter.
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), glassMat());
  cabin.scale.set(0.84, 0.34, 1.1);
  cabin.position.set(0, 0.86, 0.18);
  cabin.castShadow = true;
  g.add(cabin);

  // Hood scoop on the hero car.
  if (o.hero) {
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bodyMat);
    scoop.scale.set(0.42, 0.14, 0.7);
    scoop.position.set(0, 0.9, -1.15);
    g.add(scoop);
    // Spoiler: a curved wing on two struts.
    const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bodyMat);
    wing.scale.set(0.95, 0.07, 0.32);
    wing.position.set(0, 0.98, 2.05);
    wing.rotation.x = -0.12;
    g.add(wing);
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.7 });
    for (const s of [-0.6, 0.6]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), strutMat);
      strut.position.set(s, 0.84, 2.05);
      g.add(strut);
    }
    // Racing stripes: twin white ribbons following the deck silhouette
    // (hood, over the cabin, rear deck) — the signature detail on the #3
    // ref's hero. A ribbon hugging the surface profile reads as a stripe;
    // short flat lenses read as eyes, and a scaled tube crushes its own
    // position. The ribbon takes the max of the body and cabin tops.
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf2f0ea, roughness: 0.4, side: THREE.DoubleSide,
    });
    const bodyTop = (z) => 0.56 + 0.38 * Math.sqrt(Math.max(0, 1 - (z / 2.35) * (z / 2.35)));
    const cabinTop = (z) => 0.86 + 0.34 * Math.sqrt(Math.max(0, 1 - ((z - 0.18) / 1.1) * ((z - 0.18) / 1.1)));
    const surfTop = (z) => Math.max(bodyTop(z), cabinTop(z)) + 0.012;
    for (const sx of [-0.18, 0.18]) {
      const steps = 24;
      const hw = 0.09;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= steps; i++) {
        const z = -2.1 + (4.2 * i) / steps;
        const y = surfTop(z);
        pos.push(sx - hw, y, z, sx + hw, y, z);
        if (i < steps) {
          const a = i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, stripeMat));
    }
    // Full-width LED tail bar across the rear deck.
    const tailBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.07, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xff2038, emissive: 0xff2038, emissiveIntensity: 2.0 }),
    );
    tailBar.position.set(0, 0.62, 2.28);
    g.add(tailBar);
  }

  // Front grille: a dark low slot so the nose reads from ahead.
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.12, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.6 }),
  );
  grille.position.set(0, 0.42, -2.32);
  g.add(grille);

  // Police: black doors band + light bar.
  let lightBar = null;
  if (police) {
    const band = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.5 }));
    band.scale.set(1.05, 0.26, 1.1);
    band.position.set(0, 0.62, 0.1);
    g.add(band);
    const barBase = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.5 }),
    );
    barBase.rotation.z = Math.PI / 2;
    barBase.position.set(0, 1.12, 0.15);
    g.add(barBase);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff2038, emissive: 0xff2038, emissiveIntensity: 2.4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2060ff, emissive: 0x2060ff, emissiveIntensity: 2.4 });
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), redMat);
    red.scale.set(1.6, 0.8, 0.9);
    red.position.set(-0.42, 1.22, 0.15);
    const blue = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), blueMat);
    blue.scale.set(1.6, 0.8, 0.9);
    blue.position.set(0.42, 1.22, 0.15);
    g.add(red, blue);
    const redGlow = glowSprite('rgba(255,40,60,0.7)', 3.2, 0.8);
    redGlow.position.copy(red.position);
    const blueGlow = glowSprite('rgba(40,100,255,0.7)', 3.2, 0.8);
    blueGlow.position.copy(blue.position);
    g.add(redGlow, blueGlow);
    lightBar = { redMat, blueMat, redGlow, blueGlow };
  }

  // Wheels: dark cylinders + bright hubcaps.
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.95 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xc8c8d0, roughness: 0.3, metalness: 0.8 });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.92, -1.45], [0.92, -1.45], [-0.92, 1.45], [0.92, 1.45]]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hubMat);
    hub.scale.set(0.5, 1, 1);
    hub.position.x = wx > 0 ? 0.14 : -0.14;
    wheel.add(tire, hub);
    wheel.position.set(wx, 0.38, wz);
    g.add(wheel);
    wheels.push(wheel);
  }

  // Headlights (on at dusk) + taillights.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 2.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2038, emissive: 0xff2038, emissiveIntensity: 1.8 });
  for (const s of [-0.62, 0.62]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), headMat);
    head.scale.set(1.4, 0.7, 0.6);
    head.position.set(s, 0.58, -2.28);
    g.add(head);
    const hg = glowSprite('rgba(255,240,190,0.6)', 1.6, 0.7);
    hg.position.set(s, 0.58, -2.4);
    g.add(hg);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), tailMat);
    tail.scale.set(1.6, 0.6, 0.5);
    tail.position.set(s, 0.6, 2.3);
    g.add(tail);
  }
  // Headlight pools on the road ahead.
  const pool = glowSprite('rgba(255,230,160,0.35)', 7, 0.35);
  pool.position.set(0, 0.15, -5.5);
  g.add(pool);

  g.userData = { wheels, lightBar, police, hero: !!o.hero };
  return g;
}

// The police helicopter: rounded body, tail boom, spinning rotors, skids,
// and the big searchlight cone that tracks the player.
export function makeHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.4, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), bodyMat);
  body.scale.set(1, 0.85, 1.9);
  body.castShadow = true;
  g.add(body);
  // Belly stripe (white).
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5 }));
  belly.scale.set(0.86, 0.4, 1.7);
  belly.position.y = -0.42;
  g.add(belly);
  // Cockpit glass.
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), glassMat());
  glass.scale.set(0.82, 0.6, 0.8);
  glass.position.set(0, 0.18, -1.35);
  g.add(glass);
  // Tail boom + fin.
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.3, 3.6, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.25, 3.2);
  boom.castShadow = true;
  g.add(boom);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 4), bodyMat);
  fin.scale.set(1, 1, 0.18);
  fin.position.set(0, 0.9, 4.8);
  g.add(fin);
  // Tail rotor.
  const tailRotor = new THREE.Group();
  const trBladeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
  const trMat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.6 });
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(trBladeGeo, trMat);
    b.rotation.x = (i * Math.PI) / 2;
    tailRotor.add(b);
  }
  tailRotor.position.set(0.35, 0.5, 4.8);
  tailRotor.rotation.y = Math.PI / 2;
  g.add(tailRotor);
  // Main rotor: hub + two long blades + blur disc.
  const rotor = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), trMat);
  rotor.add(hub);
  const bladeGeo = new THREE.CylinderGeometry(0.06, 0.06, 7.6, 6);
  bladeGeo.scale(1, 1, 0.12);
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(bladeGeo, trMat);
    b.rotation.y = (i * Math.PI) / 2;
    rotor.add(b);
  }
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(3.9, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  rotor.add(blur);
  rotor.position.y = 1.05;
  g.add(rotor);
  // Skids.
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.5, metalness: 0.6 });
  for (const s of [-0.8, 0.8]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6), skidMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(s, -1.05, 0);
    g.add(skid);
    for (const z of [-0.8, 0.8]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), skidMat);
      strut.position.set(s, -0.8, z);
      g.add(strut);
    }
  }
  // Searchlight lamp under the nose.
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 3 }),
  );
  lamp.position.set(0, -0.75, -1.2);
  g.add(lamp);
  const lampGlow = glowSprite('rgba(255,245,210,0.9)', 3.5, 0.9);
  lampGlow.position.copy(lamp.position);
  g.add(lampGlow);

  // The spotlight cone: outer wide cone + inner bright cone, additive.
  const coneGroup = new THREE.Group();
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c0, transparent: true, opacity: 0.10,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    fog: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 42, 24, 1, true), coneMat);
  cone.position.y = -21;
  coneGroup.add(cone);
  const coneMat2 = new THREE.MeshBasicMaterial({
    color: 0xfff8d8, transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    fog: false,
  });
  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 42, 20, 1, true), coneMat2);
  cone2.position.y = -21;
  coneGroup.add(cone2);
  // Bright pool where the cone hits the ground.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(4, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfff2c0, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  coneGroup.add(pool);
  coneGroup.position.set(0, -0.8, -1.2);
  g.add(coneGroup);

  g.userData = { rotor, tailRotor, coneGroup, pool, lamp };
  return g;
}

// Aim the heli's spotlight cone at a ground target. The cone group hangs
// from the heli; we stretch + tilt it so its tip stays at the lamp and its
// base lands on the target.
export function aimSpotlight(heli, target) {
  const cg = heli.userData.coneGroup;
  const lampWorld = new THREE.Vector3();
  heli.userData.lamp.getWorldPosition(lampWorld);
  const to = target.clone().sub(lampWorld);
  const len = to.length();
  const dir = to.normalize();
  // Cone geometry points down -Y from the lamp; orient -Y along dir.
  // q is a WORLD-space quaternion, but the cone group is a child of the
  // heli group, so convert it into the heli's local space first.
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const pq = new THREE.Quaternion();
  heli.getWorldQuaternion(pq);
  cg.quaternion.copy(pq.invert().multiply(q));
  cg.scale.set(1, len / 42, 1);
  // The pool sits at the target point but stays flat on the ground: counter
  // the cone group's tilt, keeping its own flat (facing-up) orientation.
  // Its local Y is -42 (not -len): the cone group's Y scale (len/42)
  // stretches it to exactly -len, so the pool lands on the target.
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  heli.userData.pool.position.set(0, -42, 0);
  heli.userData.pool.quaternion.copy(q.clone().invert().multiply(flat));
}
