// The police helicopter — built as a DIRECT scene mesh and nothing else.
// V26's heli never rendered because its body lived behind an indirection in
// the police module and never moved with the position it was given. Here the
// heli is one THREE.Group added straight to the scene by main.js, and only
// this module's update() ever touches its position. The body is big (rotor
// ~13 units across), dark with a glass cockpit, skids, a spinning main rotor
// and tail rotor, and a white spotlight cone that tracks the player.

import { clamp } from './util.js';

export function buildHelicopter() {
  const heli = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0d1218 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.8 });
  const accentMat = new THREE.MeshLambertMaterial({ color: 0xd94040 });

  // Fuselage: a rounded body (box + nose sphere) with a glass cockpit.
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 4.6), bodyMat);
  fuselage.position.y = 0;
  fuselage.castShadow = true;
  heli.add(fuselage);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), bodyMat);
  nose.scale.set(1, 0.85, 1.1);
  nose.position.set(0, -0.1, 2.2);
  heli.add(nose);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), glassMat);
  cockpit.scale.set(0.95, 0.7, 0.9);
  cockpit.position.set(0, 0.35, 2.0);
  heli.add(cockpit);
  // Belly + engine deck.
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), darkMat);
  belly.position.y = -1.1;
  heli.add(belly);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.6), darkMat);
  deck.position.y = 1.15;
  heli.add(deck);
  // Tail boom + fin + tail rotor.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 5.2, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.25, -4.6);
  heli.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 1.1), accentMat);
  fin.position.set(0, 0.9, -6.9);
  heli.add(fin);
  const tailRotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.06), darkMat);
    blade.rotation.z = a;
    tailRotor.add(blade);
  }
  tailRotor.position.set(0.35, 0.5, -6.9);
  heli.add(tailRotor);
  // Landing skids.
  for (const sx of [-0.95, 0.95]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 6), darkMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -1.75, 0.2);
    heli.add(skid);
    for (const sz of [-1.2, 1.2]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6), darkMat);
      strut.position.set(sx, -1.4, sz);
      heli.add(strut);
    }
  }
  // Main rotor: mast + two long blades + a translucent blur disc.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8), darkMat);
  mast.position.y = 1.75;
  heli.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 2.2;
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 0.5), darkMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  // Red tips so the rotor reads at a glance.
  for (const [tx, tz] of [[6.2, 0], [-6.2, 0], [0, 6.2], [0, -6.2]]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.52), accentMat);
    tip.position.set(tx, 0, tz);
    rotor.add(tip);
  }
  heli.add(rotor);
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(6.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  blur.position.y = 2.22;
  heli.add(blur);
  // Searchlight housing under the nose.
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }),
  );
  lamp.position.set(0.6, -1.0, 2.4);
  heli.add(lamp);
  // Red anti-collision beacon on the tail.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  beacon.position.set(0, 1.1, -6.9);
  heli.add(beacon);

  // Spotlight cone: apex at the heli, base on the ground at the target.
  // Built as a unit cone, rescaled and re-aimed every frame in update().
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff8d8,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), coneMat);
  const coneGroup = new THREE.Group();
  coneGroup.add(cone);
  // Ground pool of light where the cone lands.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({
      color: 0xfff8d8, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.12;

  const UP = new THREE.Vector3(0, 1, 0);
  const tmpDir = new THREE.Vector3();
  const tmpMid = new THREE.Vector3();

  return {
    group: heli,
    coneGroup,
    pool,
    rotor,
    tailRotor,
    beacon,
    // Orbit above the target at a fixed safe altitude (above every rooftop),
    // spotlight locked on the target. Only this function moves the heli.
    // opts: { radius, altitude } — shots pull the heli in front of the
    // camera (radius ~70, altitude ~38) so it lands upper-center in frame.
    update(dt, time, target, orbitAngle, opts = {}) {
      const altitude = opts.altitude ?? 52;
      const radius = opts.radius ?? 20;
      const hx = target.x + Math.cos(orbitAngle) * radius;
      const hz = target.z + Math.sin(orbitAngle) * radius;
      const hy = altitude + Math.sin(time * 0.7) * 1.5;
      heli.position.set(hx, hy, hz);
      // Face the direction of travel, with a slight bank.
      heli.rotation.y = -orbitAngle;
      heli.rotation.z = 0.08;
      heli.rotation.x = 0.04;
      rotor.rotation.y += dt * 22;
      tailRotor.rotation.x += dt * 30;
      beacon.visible = Math.sin(time * 6) > 0;
      // Aim the cone: apex at the heli, base at the target on the ground.
      tmpDir.set(target.x - hx, 0 - hy, target.z - hz);
      const dist = tmpDir.length();
      tmpMid.set((hx + target.x) / 2, hy / 2, (hz + target.z) / 2);
      coneGroup.position.copy(tmpMid);
      coneGroup.quaternion.setFromUnitVectors(UP, tmpDir.normalize().negate());
      cone.scale.set(6.5, dist, 6.5);
      pool.position.set(target.x, 0.12, target.z);
      pool.scale.setScalar(6.5);
    },
  };
}
