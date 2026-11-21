// Cars: low-poly box-built vehicles — the hero Tempest GT, traffic cars and
// VBPD cruisers with flashing light bars. Simple arcade driving: throttle,
// steering, handbrake drift, speed in km/h.

(function () {
  'use strict';
  const U = VB.util;

  function wheel(x, z) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    return w;
  }

  // bodyColor, cabinColor, opts: { spoiler, lightbar, taxi }
  function makeCar(bodyColor, cabinColor, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.55 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 4.6), bodyMat);
    body.position.y = 0.72;
    g.add(body);
    // Nose + tail taper boxes.
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.9), bodyMat);
    nose.position.set(0, 0.62, -2.5);
    g.add(nose);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.62, 2.3),
      new THREE.MeshStandardMaterial({ color: cabinColor, roughness: 0.15, metalness: 0.7 })
    );
    cabin.position.set(0, 1.32, 0.25);
    g.add(cabin);
    // Headlights + full-width taillight bar.
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    for (const x of [-0.72, 0.72]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), hl);
      h.position.set(x, 0.78, -2.96);
      g.add(h);
    }
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.18, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a })
    );
    tail.position.set(0, 0.86, 2.32);
    g.add(tail);
    if (opts.spoiler) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 }));
      sp.position.set(0, 1.28, 2.15);
      g.add(sp);
      for (const x of [-0.8, 0.8]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), sp.material);
        leg.position.set(x, 1.1, 2.15);
        g.add(leg);
      }
    }
    let barL = null, barR = null;
    if (opts.lightbar) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      base.position.set(0, 1.72, 0.25);
      g.add(base);
      barL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.36), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
      barL.position.set(-0.4, 1.86, 0.25);
      g.add(barL);
      barR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.36), new THREE.MeshBasicMaterial({ color: 0x2060ff }));
      barR.position.set(0.4, 1.86, 0.25);
      g.add(barR);
    }
    g.add(wheel(-0.95, -1.5)); g.add(wheel(0.95, -1.5));
    g.add(wheel(-0.95, 1.5)); g.add(wheel(0.95, 1.5));
    g.userData.barL = barL; g.userData.barR = barR;
    return g;
  }

  function makePoliceCar() {
    const g = makeCar(0xf2f2f2, 0x1a2536, { lightbar: true });
    // Black doors + VBPD band.
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(2.14, 0.4, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x141c2a, roughness: 0.5 })
    );
    band.position.set(0, 0.72, 0.1);
    g.add(band);
    return g;
  }

  const Cars = {
    hero: null, cruisers: [], traffic: [],
    heroState: { speed: 0, heading: 0, drift: 0, inCar: true },

    build(scene) {
      // Hero Tempest GT — electric blue, spoiler, big presence.
      this.hero = makeCar(VB.CONFIG.car.color, 0x101c2a, { spoiler: true });
      this.hero.position.set(VB.CONFIG.chase.heroPos.x, 0, VB.CONFIG.chase.heroPos.z);
      this.hero.rotation.y = VB.CONFIG.chase.heroRot;
      scene.add(this.hero);

      // Four cruisers, staged so ALL FOUR sit inside the chase frame.
      for (const c of VB.CONFIG.chase.cruisers) {
        const p = makePoliceCar();
        p.position.set(c.x, 0, c.z);
        p.rotation.y = c.rot;
        scene.add(p);
        this.cruisers.push(p);
      }

      // Traffic: a dozen coloured cars parked/driving on the avenues.
      const cols = [0xd84a5a, 0xe8a33d, 0x2a9a8a, 0xf2f2f2, 0x5a7ad8, 0x8a8a8a, 0xc95a2a];
      const rnd = U.mulberry32(4242);
      const spots = [
        [-5, -60, 0], [9, -80, 0.1], [-5, -110, 0], [12, 60, Math.PI],
        [-6, 90, 3.1], [40, -30, 1.57], [-40, 30, -1.57], [30, -100, 0.05],
        [-30, -90, 0], [50, 60, Math.PI], [-50, -60, 0.02], [70, -40, -1.57],
      ];
      for (let i = 0; i < spots.length; i++) {
        const [x, z, r] = spots[i];
        const t = makeCar(cols[i % cols.length], 0x18222e, {});
        t.position.set(x, 0, z);
        t.rotation.y = r;
        scene.add(t);
        this.traffic.push({ mesh: t, speed: 6 + rnd() * 6, dir: r });
      }
    },

    // Arcade drive: throttle accelerates, steering turns with speed, SPACE drifts.
    drive(dt, input) {
      const s = this.heroState;
      if (!s.inCar) return;
      const th = input.throttle();
      const st = input.steer();
      const hand = input.down('Space');
      s.speed += th * (th > 0 ? 26 : 34) * dt;
      s.speed -= s.speed * (hand ? 1.4 : 0.35) * dt;
      s.speed = U.clamp(s.speed, -9, 38);
      const turnRate = st * U.clamp(Math.abs(s.speed) / 10, 0, 1) * (hand ? 1.9 : 1.15);
      s.heading -= turnRate * dt * (s.speed < 0 ? -1 : 1);
      this.hero.rotation.y = s.heading;
      const fx = -Math.sin(s.heading), fz = -Math.cos(s.heading);
      this.hero.position.x += fx * s.speed * dt;
      this.hero.position.z += fz * s.speed * dt;
      // Keep inside the city.
      const b = VB.world.bounds;
      this.hero.position.x = U.clamp(this.hero.position.x, b.minX, b.maxX);
      this.hero.position.z = U.clamp(this.hero.position.z, b.minZ, b.maxZ);
      // Drift feel: lateral slide while handbraking at speed.
      s.drift = hand && Math.abs(s.speed) > 12 ? Math.min(1, s.drift + dt * 2) : Math.max(0, s.drift - dt * 3);
      if (s.drift > 0.3) {
        this.hero.position.x += Math.cos(s.heading) * st * s.drift * 4 * dt;
        this.hero.position.z += -Math.sin(s.heading) * st * s.drift * 4 * dt;
      }
    },

    speedKmh() { return Math.round(Math.abs(this.heroState.speed) * 3.6); },

    update(dt, t) {
      // Light bars flash alternately; traffic cruises along the avenues.
      const phase = Math.floor(t * 6) % 2 === 0;
      for (const c of this.cruisers) {
        if (c.userData.barL) c.userData.barL.material.color.setHex(phase ? 0xff2020 : 0x550000);
        if (c.userData.barR) c.userData.barR.material.color.setHex(phase ? 0x001155 : 0x2060ff);
      }
      for (const car of this.traffic) {
        const m = car.mesh;
        m.position.x += -Math.sin(car.dir) * car.speed * dt;
        m.position.z += -Math.cos(car.dir) * car.speed * dt;
        if (m.position.z < -150 || m.position.z > 150 || m.position.x < -150 || m.position.x > 150) {
          m.position.x = -m.position.x * 0.9;
          m.position.z = -m.position.z * 0.9;
        }
      }
    },
  };

  VB.cars = Cars;
})();
