// Police air + ground pursuit. The helicopter is BIG and CLOSE in the chase
// shot (scale 1.9, low over the avenue) with a BRIGHT, narrow spotlight beam
// and a soft pool on the road — toned down so the asphalt never blows out.
// Cruisers steer toward the hero; the heli orbits above and keeps the light
// on the car.

(function () {
  'use strict';
  const U = VB.util;

  const Police = {
    heli: null, rotor: null, beam: null, pool: null, heliLight: null,

    buildHeli(scene) {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x35486b, roughness: 0.4, metalness: 0.5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 5.2), bodyMat);
      g.add(body);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 1.6), bodyMat);
      nose.position.set(0, -0.2, -3.1);
      g.add(nose);
      // Glass canopy.
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 1.1, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x9ad8e8, roughness: 0.1, metalness: 0.8 })
      );
      glass.position.set(0, 0.5, -2.2);
      g.add(glass);
      // Tail boom + fin + tail rotor.
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 5.4), bodyMat);
      tail.position.set(0, 0.3, 5.0);
      g.add(tail);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 1.2), bodyMat);
      fin.position.set(0, 1.0, 7.4);
      g.add(fin);
      const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.18), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      tailRotor.position.set(0.3, 1.0, 7.4);
      g.add(tailRotor);
      // Skids.
      for (const x of [-1.1, 1.1]) {
        const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        skid.position.set(x, -1.35, 0);
        g.add(skid);
      }
      // White VBPD belly band + stripe + belly plate (visible from below).
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.7, 3.4), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }));
      band.position.set(0, -0.3, -0.4);
      g.add(band);
      const belly = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 4.2), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 }));
      belly.position.set(0, -0.98, -0.2);
      g.add(belly);
      // Main rotor (spins in update).
      this.rotor = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.6 }));
        blade.rotation.y = i * Math.PI / 2;
        this.rotor.add(blade);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      hub.position.y = 0.2;
      this.rotor.add(hub);
      this.rotor.position.y = 1.35;
      g.add(this.rotor);
      // Red beacon.
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
      beacon.position.set(0, -1.1, 2.4);
      g.add(beacon);
      this.beacon = beacon;

      // Spotlight: a WIDE, soft cone AIMED from the heli lamp at the hero car.
      // It lives in world space (not a child of the heli) so it can slant
      // diagonally onto the car instead of hanging as a vertical pillar.
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfff2c0, transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      this.beam = new THREE.Mesh(new THREE.ConeGeometry(5.0, 26, 20, 1, true), beamMat);
      scene.add(this.beam);
      // Bright core cone inside it.
      this.beamCore = new THREE.Mesh(
        new THREE.ConeGeometry(2.0, 26, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      scene.add(this.beamCore);
      // Small lamp housing under the nose.
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfffbe0 }));
      lamp.position.set(0, -1.05, -2.6);
      g.add(lamp);

      const hp = VB.CONFIG.chase.heliPos;
      g.position.set(hp.x, hp.y, hp.z);
      g.scale.setScalar(VB.CONFIG.chase.heliScale);
      g.rotation.y = 0.5;
      scene.add(g);
      this.heli = g;

      // Spotlight pool on the road: soft, warm, TONED DOWN (opacity 0.22).
      this.pool = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 16),
        new THREE.MeshBasicMaterial({
          map: U.glowTexture('rgba(255,244,200,0.55)', 'rgba(255,244,200,0)'),
          transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      this.pool.rotation.x = -Math.PI / 2;
      this.pool.position.set(2, 0.12, 2);
      scene.add(this.pool);

      // Real light so the hero car + road catch the beam.
      this.heliLight = new THREE.SpotLight(0xfff2c0, 900, 70, 0.42, 0.6, 1.2);
      this.heliLight.position.copy(g.position);
      scene.add(this.heliLight);
      scene.add(this.heliLight.target);
    },

    // Cruisers chase the hero with simple pursuit steering.
    updateGround(dt, heroPos) {
      for (const c of VB.cars.cruisers) {
        const dx = heroPos.x - c.position.x, dz = heroPos.z - c.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.01) continue;
        const want = Math.atan2(-dx, -dz);
        let diff = want - c.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.rotation.y += U.clamp(diff, -1.6 * dt, 1.6 * dt);
        const speed = dist > 14 ? 17 : 9;
        c.position.x += -Math.sin(c.rotation.y) * speed * dt;
        c.position.z += -Math.cos(c.rotation.y) * speed * dt;
        // Don't overlap the hero.
        if (dist < 5.5) {
          c.position.x -= -Math.sin(c.rotation.y) * speed * dt * 1.4;
          c.position.z -= -Math.cos(c.rotation.y) * speed * dt * 1.4;
        }
      }
    },

    update(dt, t, heroPos, staged) {
      if (!this.heli) return;
      this.rotor.rotation.y += dt * 22;
      this.beacon.material.color.setHex(Math.floor(t * 3) % 2 ? 0xff2020 : 0x550000);
      if (!staged) {
        // Live pursuit: orbit above the hero, keep the beam on the car.
        const tx = heroPos.x - 14 + Math.sin(t * 0.25) * 6;
        const tz = heroPos.z - 26 + Math.cos(t * 0.2) * 6;
        this.heli.position.x = U.damp(this.heli.position.x, tx, 1.2, dt);
        this.heli.position.z = U.damp(this.heli.position.z, tz, 1.2, dt);
        this.heli.position.y = 26 + Math.sin(t * 0.6) * 0.8;
        this.heli.rotation.y = U.damp(this.heli.rotation.y, 0.5 + Math.sin(t * 0.2) * 0.15, 1, dt);
      }
      // Aim the beam: apex at the heli lamp, base on the hero car.
      const hp = this.heli.position;
      const lampPos = new THREE.Vector3(hp.x, hp.y - 2, hp.z - 2);
      const target = new THREE.Vector3(heroPos.x, 0.3, heroPos.z);
      const dir = new THREE.Vector3().subVectors(target, lampPos);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(lampPos, target).multiplyScalar(0.5);
      const up = new THREE.Vector3(0, 1, 0);
      const aim = dir.clone().normalize().negate(); // cone +Y points at the heli
      const q = new THREE.Quaternion().setFromUnitVectors(up, aim);
      for (const cone of [this.beam, this.beamCore]) {
        cone.position.copy(mid);
        cone.quaternion.copy(q);
        cone.scale.set(1, len / 26, 1);
      }
      // Pool + light track the hero car.
      this.pool.position.x = U.damp(this.pool.position.x, heroPos.x, 4, dt);
      this.pool.position.z = U.damp(this.pool.position.z, heroPos.z, 4, dt);
      this.heliLight.position.set(hp.x, hp.y - 1, hp.z - 2);
      this.heliLight.target.position.set(heroPos.x, 0, heroPos.z);
    },
  };

  VB.police = Police;
})();
