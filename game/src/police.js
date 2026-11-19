// SOLMAR BAY — the wanted system: heat, stars, pursuing units and AIR-1.
// setWanted always sets heat too, or the level auto-clears on the next tick.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var U = SB.utils;

  var UNITS = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 33'];
  var state = null;

  function init(scene, opts) {
    state = {
      scene: scene, stars: 0, heat: 0, lastCrimeAt: -100,
      units: [], heli: null, heliAngle: 0,
      blinkT: 0, lightRed: true, bustedT: 0,
      altLight: new THREE.PointLight(0xff2020, 0, 30, 1.8),
      rng: new U.RNG((opts && opts.seed) || 31)
    };
    scene.add(state.altLight);
    return state;
  }

  function wanted() { return state ? state.stars : 0; }

  function setWanted(n, heat) {
    if (!state) return;
    state.stars = U.clamp(Math.round(n), 0, 5);
    // Heat anchors the level: without it the decay below would clear the stars.
    state.heat = heat !== undefined ? heat : state.stars * 20;
    state.lastCrimeAt = performance.now() / 1000;
    syncUnits();
    SB.audio.setSiren(state.stars > 0);
  }

  function addHeat(amount) {
    if (!state) return;
    state.heat = U.clamp(state.heat + amount, 0, 100);
    state.lastCrimeAt = performance.now() / 1000;
    var stars = state.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(state.heat / 20));
    if (stars !== state.stars) {
      state.stars = stars;
      syncUnits();
      SB.audio.setSiren(state.stars > 0);
    }
  }

  function wantedUnits() {
    if (state.stars <= 0) return 0;
    return Math.min(4, state.stars + (state.stars >= 2 ? 1 : 0));
  }

  function spawnUnit(idx, near) {
    var car = SB.cars.makeCar('police', { name: UNITS[idx % UNITS.length] });
    // Place through car state (never at the origin): on a road near the player.
    var roads = [-80, -40, 0, 40, 80];
    var rx = roads[Math.floor(state.rng.next() * roads.length)];
    var rz = near.z + (state.rng.next() < 0.5 ? -1 : 1) * (26 + state.rng.next() * 22);
    SB.cars.placeCar(car, rx + U.clamp(near.x - rx, -4, 4) * 0 + (near.x > rx ? 3 : -3), U.clamp(rz, -120, 108), Math.atan2(near.x - rx, near.z - rz));
    car.group.position.x = U.clamp(car.group.position.x, -110, 108);
    state.scene.add(car.group);
    state.units.push(car);
    return car;
  }

  function syncUnits() {
    if (!state) return;
    var want = wantedUnits();
    var near = SB.game ? SB.game.playerPos() : { x: 0, z: 0 };
    while (state.units.length < want) spawnUnit(state.units.length, near);
    while (state.units.length > want) {
      var c = state.units.pop();
      state.scene.remove(c.group);
    }
    // Helicopter from 3 stars up.
    if (state.stars >= 3 && !state.heli) state.heli = makeHeli(state.scene);
    if (state.stars < 3 && state.heli) {
      state.scene.remove(state.heli.group);
      state.scene.remove(state.heli.spot.target);
      state.heli = null;
    }
  }

  function makeHeli(scene) {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2233, roughness: 0.4, metalness: 0.6 });
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.08, metalness: 1 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 3.6), bodyMat);
    body.castShadow = true;
    g.add(body);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), glassMat);
    nose.scale.set(1, 0.75, 1);
    nose.position.set(0, 0.1, 1.8);
    g.add(nose);
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.4, 3.0), whiteMat);
    stripe.position.y = -0.3;
    g.add(stripe);
    var boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 4.6, 8), bodyMat);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 0.3, -3.9);
    g.add(boom);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.8), bodyMat);
    fin.position.set(0, 0.8, -6.0);
    g.add(fin);
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6), bodyMat);
    mast.position.y = 1.0;
    g.add(mast);
    var rotor = new THREE.Group();
    [0, Math.PI / 2].forEach(function (a) {
      var blade = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.06, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5, metalness: 0.5 }));
      blade.rotation.y = a;
      rotor.add(blade);
    });
    rotor.position.y = 1.4;
    g.add(rotor);
    [-0.9, 0.9].forEach(function (x) {
      var skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 6), bodyMat);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(x, -1.05, 0);
      g.add(skid);
    });
    // Searchlight: short narrow dim cone (24 m) + spotlight, aimed at the player.
    // Narrow + FrontSide + dim: a wide DoubleSide cone reads as a fog blob
    // when the chase camera flies near it.
    var coneGeo = new THREE.ConeGeometry(2.4, 24, 16, 1, true);
    coneGeo.translate(0, -12, 0); // apex at origin, base 24 m below
    coneGeo.rotateX(-Math.PI / 2); // beam now extends toward +Z
    var cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      color: 0xfff2c0, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide
    }));
    var aim = new THREE.Group();
    aim.add(cone);
    g.add(aim);
    var spot = new THREE.SpotLight(0xfff2c0, 160, 46, 0.32, 0.5, 1.2);
    spot.position.set(0, -0.8, 0.5);
    g.add(spot);
    scene.add(spot.target);
    var beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    beacon.position.set(0, -0.9, -1.2);
    g.add(beacon);
    scene.add(g);
    return { group: g, rotor: rotor, spot: spot, aim: aim, beacon: beacon };
  }

  function update(dt, t, player) {
    if (!state) return;
    // Heat decay: only when the player has been clean for a while and no unit
    // is close. Stars fall as heat crosses the thresholds.
    var now = performance.now() / 1000;
    var nearest = 1e9;
    state.units.forEach(function (u) {
      var d2 = U.dist2(u.group.position.x, u.group.position.z, player.x, player.z);
      if (d2 < nearest) nearest = d2;
    });
    if (state.stars > 0 && now - state.lastCrimeAt > 14 && nearest > 1600) {
      state.heat = Math.max(0, state.heat - dt * 3.2);
      var stars = state.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(state.heat / 20));
      if (stars !== state.stars) {
        state.stars = stars;
        syncUnits();
        SB.audio.setSiren(state.stars > 0);
        if (stars === 0 && SB.hud) SB.hud.toast('You lost them. The heat is off — for now.');
      }
    }
    // Light-bar strobe: red/blue alternate ~0.35 s.
    state.blinkT += dt;
    if (state.blinkT > 0.35) { state.blinkT = 0; state.lightRed = !state.lightRed; }
    var blink = 0.75 + 0.25 * Math.sin(t * 9); // stays >= 0.75 at capture
    state.units.forEach(function (u, i) {
      var redOn = state.lightRed === (i % 2 === 0);
      if (u.barGlowR) u.barGlowR.material.opacity = redOn ? blink : 0.12;
      if (u.barGlowB) u.barGlowB.material.opacity = redOn ? 0.12 : blink;
      if (u.barRed) u.barRed.material.emissiveIntensity = redOn ? 4 : 0.6;
      if (u.barBlue) u.barBlue.material.emissiveIntensity = redOn ? 0.6 : 4;
    });
    // One alternating point light rides above the nearest unit.
    if (state.units.length > 0) {
      var n0 = state.units[0];
      state.altLight.position.set(n0.group.position.x, 3.2, n0.group.position.z);
      state.altLight.color.setHex(state.lightRed ? 0xff2020 : 0x2a55ff);
      state.altLight.intensity = 42;
    } else {
      state.altLight.intensity = 0;
    }
    // Chase AI: steer at the player, ram, respawn when too far.
    var busted = false;
    state.units.forEach(function (u) {
      var dx = player.x - u.group.position.x;
      var dz = player.z - u.group.position.z;
      var d2 = dx * dx + dz * dz;
      if (d2 > 8100) { // > 90 m: respawn near the player on a road
        var roads = [-80, -40, 0, 40, 80];
        var rx = roads[Math.floor(Math.random() * roads.length)];
        SB.cars.placeCar(u, rx, U.clamp(player.z + (Math.random() < 0.5 ? -38 : 38), -120, 108), 0);
        return;
      }
      var want = Math.atan2(dx, dz);
      var diff = ((want - u.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      var steer = U.clamp(diff * 2.4, -1, 1);
      var speedTarget = state.stars >= 4 ? 1 : 0.82;
      SB.cars.updateCar(u, dt, { throttle: speedTarget, steer: steer, handbrake: false });
      // Contact: damage + push.
      if (d2 < 10.2) {
        if (player.onRam) player.onRam(u);
      }
      if (d2 < 12 && player.speed < 1.5 && !player.inCar) busted = true;
      if (d2 < 12 && player.speed < 1.5 && player.inCar) busted = true;
    });
    if (busted && state.stars > 0) {
      state.bustedT += dt;
      if (state.bustedT > 3 && SB.game) SB.game.busted();
    } else {
      state.bustedT = 0;
    }
    // Helicopter: orbit above the player, searchlight locked on.
    if (state.heli) {
      state.heliAngle += dt * 0.22;
      var hx = player.x + Math.cos(state.heliAngle) * 21;
      var hz = player.z + Math.sin(state.heliAngle) * 21;
      var hy = 27;
      state.heli.group.position.set(hx, hy, hz);
      state.heli.group.lookAt(player.x, hy, player.z);
      state.heli.rotor.rotation.y += dt * 26;
      state.heli.spot.target.position.set(player.x, 0, player.z);
      state.heli.aim.lookAt(player.x, 0, player.z);
      state.heli.beacon.visible = (Math.sin(t * 6) > 0);
    }
    SB.audio.update(dt);
  }

  function reset() {
    if (!state) return;
    state.stars = 0; state.heat = 0; state.bustedT = 0;
    syncUnits();
    SB.audio.setSiren(false);
  }

  SB.police = {
    init: init, wanted: wanted, setWanted: setWanted, addHeat: addHeat,
    update: update, reset: reset,
    setHeliAngle: function (a) { if (state) state.heliAngle = a; },
    units: function () { return state ? state.units : []; },
    hasHeli: function () { return !!(state && state.heli); }
  };
})();
