// CVPD pursuit: police cruisers that chase, ram and flank, plus the AIR-3
// helicopter with a visible spotlight cone and a light pool on the ground.
var CV = window.CV || (window.CV = {});

CV.police = (function () {
  var C = CV.config;
  var units = []; // {group, state, call, tactic, dist, offset}
  var heli = null;
  var heliState = { x: 0, y: 20, z: 0 };

  function spawn(scene, heroPos) {
    // 4 cruisers staged around the hero for the chase; 2 more in reserve.
    var slots = [
      { dx: -4, dz: -16, tactic: 'RAMMING' },
      { dx: 5, dz: -22, tactic: 'RAMMING' },
      { dx: -7, dz: 6, tactic: 'FLANKING' },
      { dx: 8, dz: -8, tactic: 'PURSUE' },
    ];
    var calls = ['FALCON-2', 'SURF-9', 'TIDE-4', 'GULL-7'];
    slots.forEach(function (s, i) {
      var g = CV.cars.buildPoliceCar();
      g.position.set(heroPos.x + s.dx, 0, heroPos.z + s.dz);
      g.rotation.y = 0;
      scene.add(g);
      units.push({
        group: g, call: calls[i], tactic: s.tactic, dist: 10 + i * 7,
        state: new CV.cars.CarState(heroPos.x + s.dx, heroPos.z + s.dz, 0),
        offset: s,
      });
    });
    // Helicopter: body, tail, spinning rotors, spotlight cone + pool.
    var h = new THREE.Group();
    h.name = 'heli';
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2f4a, metalness: 0.7, roughness: 0.35 });
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 2.2, 4, 10), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    h.add(body);
    var glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x0e1e2e, metalness: 0.9, roughness: 0.12 }));
    glass.position.set(0, -0.2, 1.6);
    glass.scale.set(1, 0.8, 1);
    h.add(glass);
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.14, 4.6, 6), bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.25, -3.6);
    h.add(tail);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.9), bodyMat);
    fin.position.set(0, 0.9, -5.4);
    h.add(fin);
    [-1.3, 1.3].forEach(function (x) {
      var skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.4),
        new THREE.MeshStandardMaterial({ color: 0x333333 }));
      skid.position.set(x, -1.5, 0);
      h.add(skid);
    });
    // Main rotor (spins) + tail rotor.
    var rotorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    var rotor = new THREE.Group();
    rotor.position.y = 1.35;
    var blade1 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.07, 0.42), rotorMat);
    var blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 11), rotorMat);
    rotor.add(blade1); rotor.add(blade2);
    h.add(rotor);
    var tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.3), rotorMat);
    tailRotor.position.set(0.25, 0.7, -5.5);
    h.add(tailRotor);
    // Searchlight: white emissive lamp under the nose.
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4 }));
    lamp.position.set(0, -1.3, 1.4);
    h.add(lamp);
    // THE SPOTLIGHT CONE — a visible additive cone from the heli to the ground.
    // Apex at the origin (the lamp), base 42 m below; tilted toward the hero.
    var coneGeo = new THREE.ConeGeometry(5, 42, 20, 1, true);
    coneGeo.translate(0, -21, 0);
    var coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c0, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    var cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, -1.3, 1.4);
    h.add(cone);
    // Real spotlight + bright ground pool that follows the hero.
    var spot = new THREE.SpotLight(0xfff2c0, 900, 120, 0.42, 0.5, 1.2);
    spot.position.set(0, -1, 1.4);
    h.add(spot);
    h.add(spot.target);
    spot.target.position.set(0, -42, 6);
    var pool = new THREE.Mesh(new THREE.CircleGeometry(6, 24),
      new THREE.MeshBasicMaterial({ map: CV.textures.glow('rgba(255,240,190,1)'), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.09;
    scene.add(pool);
    heliState.x = heroPos.x + 8;
    heliState.z = heroPos.z + 34;
    h.position.set(heliState.x, heliState.y, heliState.z);
    scene.add(h);
    heli = { group: h, rotor: rotor, tailRotor: tailRotor, spot: spot, pool: pool, cone: cone };
    return { units: units.length, heli: true };
  }

  function update(dt, t, hero) {
    // Cruisers: seek the hero, ram when close, flash light bars.
    units.forEach(function (u, i) {
      var st = u.state;
      var dx = hero.x - st.x, dz = hero.z - st.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      u.dist = Math.round(dist);
      var wantHeading = Math.atan2(dx, dz);
      var dh = wantHeading - st.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      var input = { forward: dist > 4, back: false, left: dh > 0.08, right: dh < -0.08, handbrake: false };
      // Ramming units push harder; flanker holds an offset lane.
      var top = u.tactic === 'RAMMING' ? 40 : 36;
      if (u.tactic === 'FLANKING') {
        var tx = hero.x - 7, tz = hero.z + 2;
        var fdx = tx - st.x, fdz = tz - st.z;
        wantHeading = Math.atan2(fdx, fdz);
        dh = wantHeading - st.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        input.left = dh > 0.08; input.right = dh < -0.08;
        input.forward = Math.sqrt(fdx * fdx + fdz * fdz) > 2;
      }
      st.update(dt, input, top);
      var p = CV.world.collide(st.x, st.z, 1.6);
      st.x = p.x; st.z = p.z;
      u.group.position.set(st.x, 0, st.z);
      u.group.rotation.y = st.heading;
      // Alternating red/blue flash.
      var phase = Math.sin(t * 14 + i * 1.7) > 0;
      u.group.userData.redMat.emissiveIntensity = phase ? 4 : 0.6;
      u.group.userData.blueMat.emissiveIntensity = phase ? 0.6 : 4;
      u.group.userData.poolR.material.opacity = phase ? 0.8 : 0.08;
      u.group.userData.poolB.material.opacity = phase ? 0.08 : 0.8;
      u.group.userData.glow.material.opacity = 0.6 + Math.sin(t * 14 + i) * 0.3;
      u.group.userData.glow.material.color.setHex(phase ? 0xff5555 : 0x5588ff);
    });
    // Helicopter: hover ahead-above the hero, spotlight locked on.
    if (heli) {
      var tx = hero.x + 8, tz = hero.z + 34;
      heliState.x += (tx - heliState.x) * Math.min(1, dt * 1.4);
      heliState.z += (tz - heliState.z) * Math.min(1, dt * 1.4);
      heliState.y = 20 + Math.sin(t * 0.7) * 1.5;
      heli.group.position.set(heliState.x, heliState.y, heliState.z);
      heli.group.rotation.y = Math.atan2(hero.x - heliState.x, hero.z - heliState.z);
      heli.group.rotation.z = Math.sin(t * 0.5) * 0.04;
      heli.rotor.rotation.y += dt * 28;
      heli.tailRotor.rotation.x += dt * 40;
      heli.pool.position.set(hero.x, 0.09, hero.z);
      heli.pool.material.opacity = 0.45 + Math.sin(t * 3) * 0.1;
      // Aim the cone + spotlight at the hero. The group faces the hero, so
      // local +Z is the hero direction: tilt the cone fully onto the car.
      var dxh = hero.x - heliState.x, dzh = hero.z - heliState.z;
      var hdist = Math.sqrt(dxh * dxh + dzh * dzh);
      var tilt = Math.atan2(hdist, heliState.y);
      heli.cone.rotation.x = -tilt;
      heli.spot.target.position.set(0, -heliState.y, hdist);
      heli.spot.target.updateMatrixWorld();
    }
  }

  function dispatchRows() {
    var rows = units.map(function (u) {
      return { call: u.call, tactic: u.tactic, dist: u.dist };
    });
    rows.push({ call: 'AIR-3', tactic: 'SPOTLIGHT', dist: 36 });
    rows.push({ call: 'REEF-11', tactic: 'ROADBLOCK', dist: 87 });
    return rows;
  }

  function heliVisibleFrom(camera) {
    if (!heli) return false;
    var v = heli.group.position.clone().project(camera);
    return Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1;
  }

  return { spawn: spawn, update: update, dispatchRows: dispatchRows, heliVisibleFrom: heliVisibleFrom, units: units };
})();
