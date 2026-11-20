// SOLMAR BAY — traffic: twelve cars driving loops on the street grid, so the
// roads feel alive in the chase shot and the city reads as a real place.

var SB = window.SB || (window.SB = {});

SB.traffic = (function () {
  let scene = null;
  let cars = [];

  function spawn(sc) {
    scene = sc;
    cars = [];
    const R = SB.random;
    const streets = SB.config.streets;
    for (let i = 0; i < SB.config.trafficCars; i++) {
      const color = R.pick(SB.config.trafficColors);
      const mesh = SB.cars.buildTrafficCar(color);
      // A rectangular loop on two streets.
      const s1 = R.pick(streets);
      const s2 = R.pick(streets);
      const lane = R.pick([-3, 3]);
      const loop = [
        { x: s1 + lane, z: s2 },
        { x: s1 + lane, z: -s2 },
        { x: -s1 + lane, z: -s2 },
        { x: -s1 + lane, z: s2 },
      ];
      const start = loop[R.int(0, 3)];
      mesh.position.set(start.x, 0, start.z);
      scene.add(mesh);
      cars.push({
        mesh: mesh, loop: loop, wp: 1,
        speed: R.range(8, 12), heading: 0,
      });
    }
    return cars;
  }

  function update(dt) {
    for (const c of cars) {
      const wp = c.loop[c.wp];
      const dx = wp.x - c.mesh.position.x;
      const dz = wp.z - c.mesh.position.z;
      if (dx * dx + dz * dz < 16) {
        c.wp = (c.wp + 1) % c.loop.length;
        continue;
      }
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      c.mesh.position.x += Math.sin(c.heading) * c.speed * dt;
      c.mesh.position.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.rotation.y = c.heading;
    }
  }

  return { spawn: spawn, update: update, cars: function () { return cars; } };
})();
