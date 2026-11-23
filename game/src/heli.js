// The police helicopter for AURELIA BAY: a direct scene mesh — dark fuselage,
// glass cockpit, spinning main rotor, tail rotor, landing skids and a visible
// spotlight cone. It flies high above the rooftops and never clips buildings.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const MIN_ALT = 30; // above the tallest rooftop (30) with margin

  function makeHeli() {
    const heli = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x22303c });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x101c26 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x14181c });

    // Fuselage: elongated rounded body.
    const fuselage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), bodyMat);
    fuselage.scale.set(1.9, 1.05, 1.15);
    fuselage.castShadow = true;
    heli.add(fuselage);
    // White belly stripe + side band.
    const band = new THREE.Mesh(new THREE.SphereGeometry(1.52, 16, 12), whiteMat);
    band.scale.set(1.88, 0.42, 1.16);
    band.position.y = -0.45;
    heli.add(band);
    // Glass cockpit nose.
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), glassMat);
    cockpit.scale.set(1.1, 0.75, 0.95);
    cockpit.position.set(1.9, 0.15, 0);
    heli.add(cockpit);
    // Tail boom + fin + tail rotor.
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 4.2, 8), bodyMat);
    boom.rotation.z = Math.PI / 2 - 0.06;
    boom.position.set(-4.4, 0.35, 0);
    boom.castShadow = true;
    heli.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.12), bodyMat);
    fin.position.set(-6.2, 0.9, 0);
    fin.rotation.z = 0.15;
    heli.add(fin);
    const tailRotor = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.14), darkMat);
      blade.rotation.x = (i / 2) * Math.PI;
      tailRotor.add(blade);
    }
    tailRotor.position.set(-6.3, 0.5, 0.25);
    heli.add(tailRotor);
    // Main rotor mast + 4 blades + blur disc.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), darkMat);
    mast.position.y = 1.7;
    heli.add(mast);
    const rotor = new THREE.Group();
    rotor.position.y = 2.15;
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 0.34), darkMat);
      blade.position.x = 2.9;
      const holder = new THREE.Group();
      holder.rotation.y = (i / 4) * Math.PI * 2;
      holder.add(blade);
      rotor.add(holder);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), darkMat);
    rotor.add(hub);
    heli.add(rotor);
    const blur = new THREE.Mesh(new THREE.CircleGeometry(5.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    blur.rotation.x = -Math.PI / 2;
    blur.position.y = 2.18;
    heli.add(blur);
    // Landing skids.
    [-0.95, 0.95].forEach(function (z) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.0, 6), darkMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0.2, -1.65, z);
      heli.add(tube);
      [-1.2, 1.2].forEach(function (x) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), darkMat);
        strut.position.set(x, -1.25, z);
        strut.rotation.x = z > 0 ? -0.35 : 0.35;
        heli.add(strut);
      });
    });
    // Searchlight + visible cone.
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.4, 10), darkMat);
    lampHousing.rotation.x = Math.PI / 2;
    lampHousing.position.set(1.6, -1.15, 0);
    heli.add(lampHousing);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.12,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 34, 20, 1, true), coneMat);
    heli.add(cone);
    // Ground pool where the light lands.
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    heli.add(pool);
    // Blinking beacon.
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    beacon.position.set(-0.4, 1.65, 0);
    heli.add(beacon);

    heli.userData = { rotor: rotor, tailRotor: tailRotor, cone: cone, pool: pool, beacon: beacon, minAlt: MIN_ALT };
    return heli;
  }

  // Chase a target point from above, keeping altitude, spotlight on target.
  function updateHeli(heli, target, dt, t) {
    const u = heli.userData;
    u.rotor.rotation.y += dt * 22;
    u.tailRotor.rotation.z += dt * 34;
    // Hover offset: trail behind and above the target.
    const desired = new THREE.Vector3(target.x - 8, Math.max(target.y + 34, MIN_ALT), target.z + 10);
    heli.position.lerp(desired, 1 - Math.exp(-dt * 0.7));
    heli.position.y = Math.max(heli.position.y, MIN_ALT);
    heli.position.y += Math.sin(t * 1.3) * 0.006;
    // Face the direction of travel / the target.
    const look = new THREE.Vector3(target.x, heli.position.y, target.z);
    heli.lookAt(look);
    heli.rotation.z = Math.sin(t * 0.9) * 0.04; // gentle bank sway
    // Spotlight cone: from the heli belly down to the target.
    const belly = new THREE.Vector3(1.6, -1.15, 0).applyMatrix4(heli.matrixWorld);
    const toTarget = new THREE.Vector3().subVectors(target, belly);
    const len = toTarget.length();
    u.cone.position.copy(belly).sub(heli.position);
    u.cone.position.addScaledVector(toTarget.clone().normalize(), len / 2);
    u.cone.scale.set(1, len / 34, 1);
    u.cone.lookAt(target.x - heli.position.x + u.cone.position.x, target.y - heli.position.y + u.cone.position.y, target.z - heli.position.z + u.cone.position.z);
    // ConeGeometry points +y by default; flip so the apex sits at the heli.
    u.cone.rotation.x = Math.PI;
    u.pool.position.set(target.x - heli.position.x, target.y - heli.position.y + 0.06, target.z - heli.position.z);
    u.beacon.visible = Math.sin(t * 6) > 0;
  }

  // Stage the heli at an exact spot for a screenshot (no lerp drift).
  function stageHeli(heli, x, y, z, target) {
    heli.position.set(x, Math.max(y, MIN_ALT), z);
    heli.lookAt(target.x, y, target.z);
    const u = heli.userData;
    const belly = new THREE.Vector3(1.6, -1.15, 0).applyMatrix4(heli.matrixWorld);
    const toTarget = new THREE.Vector3().subVectors(target, belly);
    const len = toTarget.length();
    u.cone.position.copy(belly).sub(heli.position);
    u.cone.position.addScaledVector(toTarget.clone().normalize(), len / 2);
    u.cone.scale.set(1, len / 34, 1);
    u.cone.rotation.x = Math.PI;
    u.pool.position.set(target.x - heli.position.x, 0.06, target.z - heli.position.z);
  }

  AB.Heli = { makeHeli, updateHeli, stageHeli, MIN_ALT: MIN_ALT };
})();
