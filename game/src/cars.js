// Vehicles: the sculpted hero car, police cruisers with light bars, traffic
// sedans, and arcade car physics (throttle, steering, drift).
var CV = window.CV || (window.CV = {});

CV.cars = (function () {
  var paintMat = new THREE.MeshStandardMaterial({ color: 0xd21f2b, metalness: 0.85, roughness: 0.28 });
  var darkMat = new THREE.MeshStandardMaterial({ color: 0x14141a, metalness: 0.4, roughness: 0.5 });
  var glassMat = new THREE.MeshStandardMaterial({ color: 0x0e1e2e, metalness: 0.9, roughness: 0.12 });
  var chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.25 });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });

  function wheel(r) {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 18), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    g.add(tire);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.34, 10), chromeMat);
    hub.rotation.z = Math.PI / 2;
    g.add(hub);
    // spokes
    for (var i = 0; i < 5; i++) {
      var sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, r * 1.7, 0.36), chromeMat);
      sp.rotation.x = (i / 5) * Math.PI;
      g.add(sp);
    }
    return g;
  }

  // Hero: extruded side profile — low nose, fastback, spoiler. Glossy paint.
  function buildHeroCar() {
    var g = new THREE.Group();
    var s = new THREE.Shape();
    s.moveTo(-2.3, 0.35);
    s.lineTo(-2.25, 0.62); // nose
    s.lineTo(-1.1, 0.78);  // hood
    s.lineTo(-0.55, 1.18); // windshield base
    s.lineTo(0.35, 1.28);  // roof front
    s.lineTo(0.95, 1.22);  // roof rear
    s.lineTo(1.9, 0.86);   // fastback
    s.lineTo(2.3, 0.8);    // tail
    s.lineTo(2.3, 0.35);
    s.closePath();
    var bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2, steps: 1 });
    bodyGeo.translate(0, 0, -0.85);
    var body = new THREE.Mesh(bodyGeo, paintMat);
    body.rotation.y = Math.PI / 2; // length -> Z (forward = +Z)
    body.castShadow = true;
    g.add(body);
    // Cabin glass (trapezoid canopy).
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 1.7), glassMat);
    cabin.position.set(0, 1.18, -0.25);
    cabin.rotation.x = -0.06;
    cabin.castShadow = true;
    g.add(cabin);
    // Spoiler.
    var wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.5), darkMat);
    wing.position.set(0, 1.22, -2.05);
    wing.castShadow = true;
    g.add(wing);
    [-0.7, 0.7].forEach(function (x) {
      var strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.3), darkMat);
      strut.position.set(x, 1.0, -2.05);
      g.add(strut);
    });
    // FULL-WIDTH TAILLIGHT BAR — wide, bright, it must pop in daylight.
    var tailMat = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 4.0 });
    var tail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.26, 0.08), tailMat);
    tail.position.set(0, 0.72, -2.46); // proud of the bevelled tail face (-2.40)
    g.add(tail);
    var tailGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: CV.textures.glow('rgba(255,60,60,1)'), transparent: true,
      opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    tailGlow.scale.set(3.6, 1.3, 1);
    tailGlow.position.set(0, 0.72, -2.58);
    g.add(tailGlow);
    // Headlights.
    var headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffedb5, emissiveIntensity: 2.4 });
    [-0.62, 0.62].forEach(function (x) {
      var h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), headMat);
      h.position.set(x, 0.62, 2.46);
      g.add(h);
    });
    // Diffuser + dual exhausts + side skirts.
    var diff = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.3), darkMat);
    diff.position.set(0, 0.3, -2.44);
    g.add(diff);
    [-0.5, 0.5].forEach(function (x) {
      var ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8), chromeMat);
      ex.rotation.x = Math.PI / 2;
      ex.position.set(x, 0.32, -2.4);
      g.add(ex);
    });
    [-0.95, 0.95].forEach(function (x) {
      var sk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 3.2), darkMat);
      sk.position.set(x, 0.3, 0);
      g.add(sk);
    });
    // Wheels.
    var wpos = [[-0.92, 1.45], [0.92, 1.45], [-0.92, -1.45], [0.92, -1.45]];
    var wheels = [];
    wpos.forEach(function (p) {
      var w = wheel(0.36);
      w.position.set(p[0], 0.36, p[1]);
      g.add(w);
      wheels.push(w);
    });
    // Warm light pool under the car (hero light).
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 11),
      new THREE.MeshBasicMaterial({ map: CV.textures.glow('rgba(255,190,110,1)'), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.06;
    g.add(pool);
    g.userData.wheels = wheels;
    return g;
  }

  function buildPoliceCar() {
    var g = new THREE.Group();
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.6, roughness: 0.35 });
    var blackMat = new THREE.MeshStandardMaterial({ color: 0x14141a, metalness: 0.5, roughness: 0.45 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.4), whiteMat);
    body.position.y = 0.62; body.castShadow = true; g.add(body);
    var hood = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.12, 1.2), blackMat);
    hood.position.set(0, 0.95, 1.4); g.add(hood);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
    cabin.position.set(0, 1.18, -0.2); cabin.castShadow = true; g.add(cabin);
    var trunk = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.1, 1.1), blackMat);
    trunk.position.set(0, 0.95, -1.5); g.add(trunk);
    // Light bar: red + blue emissive.
    var bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.4), darkMat);
    bar.position.set(0, 1.52, -0.2); g.add(bar);
    var redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 3.5 });
    var blueMat = new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x1144ff, emissiveIntensity: 3.5 });
    var rl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.36), redMat);
    rl.position.set(-0.38, 1.64, -0.2); g.add(rl);
    var bl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.36), blueMat);
    bl.position.set(0.38, 1.64, -0.2); g.add(bl);
    // Big glow sprite above the bar + ground pool (must be VISIBLE).
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: CV.textures.glow('rgba(120,140,255,1)'), transparent: true,
      opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.set(5, 3.4, 1);
    glow.position.set(0, 1.9, -0.2);
    g.add(glow);
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(11, 14),
      new THREE.MeshBasicMaterial({ map: CV.textures.glow('rgba(90,120,255,1)'), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.07;
    g.add(pool);
    var poolR = new THREE.Mesh(new THREE.PlaneGeometry(11, 14),
      new THREE.MeshBasicMaterial({ map: CV.textures.glow('rgba(255,60,60,1)'), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    poolR.rotation.x = -Math.PI / 2;
    poolR.position.y = 0.08;
    g.add(poolR);
    [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]].forEach(function (p) {
      var w = wheel(0.34);
      w.position.set(p[0], 0.34, p[1]);
      g.add(w);
    });
    g.userData.glow = glow;
    g.userData.poolB = pool;
    g.userData.poolR = poolR;
    g.userData.redMat = redMat;
    g.userData.blueMat = blueMat;
    return g;
  }

  var TRAFFIC_COLORS = [0x3d7ab8, 0xe8c33d, 0x7fb069, 0xd4d4d4, 0x8b3d7a, 0x3d8b8b, 0xc96a2e];

  function buildTrafficCar(color) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.4 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.1), mat);
    body.position.y = 0.6; body.castShadow = true; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.52, 2.0), glassMat);
    cabin.position.set(0, 1.12, -0.15); g.add(cabin);
    [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]].forEach(function (p) {
      var w = wheel(0.33);
      w.position.set(p[0], 0.33, p[1]);
      g.add(w);
    });
    return g;
  }

  // ---- Arcade car state + physics.
  function CarState(x, z, heading) {
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0; // m/s, forward positive
    this.drift = 0; // 0..1 drift amount
    this.driftScore = 0;
    this.steer = 0;
  }
  CarState.prototype.update = function (dt, input, topSpeed) {
    var accel = 0;
    if (input.forward) accel += 16;
    if (input.back) accel -= input.back && this.speed > 0.5 ? 26 : 8;
    if (!input.forward && !input.back) accel -= this.speed * 0.35;
    var handbrake = input.handbrake;
    this.speed += accel * dt;
    if (handbrake) this.speed -= this.speed * 1.4 * dt;
    this.speed = Math.max(-9, Math.min(topSpeed, this.speed));
    if (Math.abs(this.speed) < 0.02 && !input.forward && !input.back) this.speed = 0;
    // Steering: less at speed, more in drift.
    var steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    var spd = Math.abs(this.speed);
    var turnRate = this.steer * (1.9 - Math.min(1.1, spd * 0.016)) * (handbrake ? 1.5 : 1);
    if (this.speed < 0) turnRate = -turnRate;
    this.heading += turnRate * Math.min(1, spd * 0.09) * dt * 2.2;
    // Drift: handbrake + steering at speed.
    var drifting = handbrake && spd > 8 && Math.abs(this.steer) > 0.4;
    this.drift += ((drifting ? 1 : 0) - this.drift) * Math.min(1, dt * 5);
    if (drifting) this.driftScore += dt * 14;
    var slip = this.drift * 0.45;
    var fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    var sx = Math.cos(this.heading), sz = -Math.sin(this.heading);
    var vx = fx * this.speed + sx * this.steer * slip * this.speed * 0.5;
    var vz = fz * this.speed + sz * this.steer * slip * this.speed * 0.5;
    this.x += vx * dt;
    this.z += vz * dt;
    return { drifting: drifting };
  };
  CarState.prototype.kmh = function () { return Math.round(Math.abs(this.speed) * 3.6); };

  return {
    buildHeroCar: buildHeroCar, buildPoliceCar: buildPoliceCar,
    buildTrafficCar: buildTrafficCar, TRAFFIC_COLORS: TRAFFIC_COLORS,
    CarState: CarState,
  };
})();
