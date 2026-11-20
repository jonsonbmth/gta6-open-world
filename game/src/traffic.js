// Traffic: cars cruising the avenue and cross streets on simple loop routes,
// braking when the hero is right ahead of them.
var CV = window.CV || (window.CV = {});

CV.traffic = (function () {
  var C = CV.config;
  var cars = [];

  var ROUTES = [
    { x: 86, z0: -200, z1: 160, dir: 1 },   // avenue southbound (left lane)
    { x: 94, z0: 160, z1: -200, dir: -1 },  // avenue northbound (right lane)
    { x: -40, z0: -200, z1: 140, dir: 1 },
    { x: 40, z0: 140, z1: -200, dir: -1 },
    { z: -40, x0: -150, x1: 84, dir: 1 },
    { z: 40, x0: 84, x1: -150, dir: -1 },
  ];

  function spawn(scene, seed) {
    var rng = new CV.random.RNG(seed + 31);
    for (var i = 0; i < 10; i++) {
      var r = ROUTES[i % ROUTES.length];
      var color = rng.pick(CV.cars.TRAFFIC_COLORS);
      var g = CV.cars.buildTrafficCar(color);
      var along = rng.range(0, 1);
      var x, z, heading;
      if (r.x !== undefined) {
        x = r.x; z = r.z0 + (r.z1 - r.z0) * along; heading = r.dir > 0 ? 0 : Math.PI;
      } else {
        z = r.z; x = r.x0 + (r.x1 - r.x0) * along; heading = r.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      g.position.set(x, 0, z);
      g.rotation.y = heading;
      scene.add(g);
      cars.push({ g: g, route: r, speed: rng.range(8, 13), x: x, z: z, heading: heading });
    }
    return cars.length;
  }

  function update(dt, hero) {
    cars.forEach(function (c) {
      var r = c.route;
      // Brake if the hero is within 9 m ahead.
      var dx = hero.x - c.x, dz = hero.z - c.z;
      var ahead = Math.sin(c.heading) * dx + Math.cos(c.heading) * dz;
      var side = Math.abs(Math.cos(c.heading) * dx - Math.sin(c.heading) * dz);
      var brake = ahead > 0 && ahead < 9 && side < 3;
      var v = brake ? 0 : c.speed;
      c.x += Math.sin(c.heading) * v * dt;
      c.z += Math.cos(c.heading) * v * dt;
      // Loop the route.
      if (r.x !== undefined) {
        if (r.dir > 0 && c.z > r.z1) c.z = r.z0;
        if (r.dir < 0 && c.z < r.z1) c.z = r.z0;
      } else {
        if (r.dir > 0 && c.x > r.x1) c.x = r.x0;
        if (r.dir < 0 && c.x < r.x1) c.x = r.x0;
      }
      c.g.position.set(c.x, 0, c.z);
    });
  }

  return { spawn: spawn, update: update, cars: cars };
})();
