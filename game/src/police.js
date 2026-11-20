// SOLMAR BAY — police: three patrol cars. At wanted level 0 they cruise their
// loops; at wanted 1+ the nearest car chases the player, siren light bar flashing.

var SB = window.SB || (window.SB = {});

SB.police = (function () {
  let scene = null;
  let cars = [];
  let flashTime = 0;

  function spawn(sc) {
    scene = sc;
    cars = [];
    const routes = [
      [{ x: -240, z: -240 }, { x: 240, z: -240 }, { x: 240, z: 240 }, { x: -240, z: 240 }],
      [{ x: -160, z: 160 }, { x: 160, z: 160 }, { x: 160, z: -160 }, { x: -160, z: -160 }],
      [{ x: 0, z: -320 }, { x: 0, z: 320 }, { x: -320, z: 320 }, { x: -320, z: -320 }],
    ];
    for (let i = 0; i < SB.config.policeCars; i++) {
      const mesh = SB.cars.buildPoliceCar();
      const start = routes[i][0];
      mesh.position.set(start.x, 0, start.z);
      scene.add(mesh);
      cars.push({
        mesh: mesh, route: routes[i], wp: 1,
        speed: 11, chasing: false, heading: 0,
      });
    }
    return cars;
  }

  function update(dt, playerPos, wanted, time) {
    flashTime = time;
    for (const c of cars) {
      // Flash the light bar while wanted (alternate red / blue).
      const on = wanted > 0;
      const phase = Math.floor(time * 6) % 2 === 0;
      c.mesh.userData.lightRed.material.emissiveIntensity = on && phase ? 4 : 0.4;
      c.mesh.userData.lightBlue.material.emissiveIntensity = on && !phase ? 4 : 0.4;

      // Nearest police chases once the player is wanted.
      let tx, tz, targetSpeed;
      if (wanted > 0) {
        tx = playerPos.x;
        tz = playerPos.z;
        targetSpeed = 30 + wanted * 2;
        c.chasing = true;
      } else {
        const wp = c.route[c.wp];
        tx = wp.x;
        tz = wp.z;
        targetSpeed = 11;
        c.chasing = false;
        const dx = tx - c.mesh.position.x;
        const dz = tz - c.mesh.position.z;
        if (dx * dx + dz * dz < 9) c.wp = (c.wp + 1) % c.route.length;
      }
      // Steer toward the target.
      const dx = tx - c.mesh.position.x;
      const dz = tz - c.mesh.position.z;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-1.8 * dt, Math.min(1.8 * dt, dh));
      c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 1.2);
      c.mesh.position.x += Math.sin(c.heading) * c.speed * dt;
      c.mesh.position.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.rotation.y = c.heading;
    }
  }

  return { spawn: spawn, update: update, cars: function () { return cars; } };
})();
