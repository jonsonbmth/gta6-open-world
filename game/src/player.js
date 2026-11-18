// Rico Marín: on foot and behind the wheel. Walking, sprinting, stealing and
// driving cars, punching, shooting, health, money and REP — everything the
// HUD and the police read lives on this one object.

import * as THREE from 'three';
import { CAR, PLAYER } from './config.js';
import { collideCircle } from './city.js';
import { driveVehicle } from './vehicles.js';
import { buildPersonMesh, animateWalk } from './pedestrians.js';

export function createPlayer(r, city, audio, start) {
  const mesh = buildPersonMesh(r, { shirt: 0x2b6cb0, pants: 0x2c3a4a, skin: 0xc9976b, hair: 0x1a1210, hat: false });
  mesh.position.set(start.x, 0, start.z);
  r.scene.add(mesh);

  // Muzzle flash: a small glowing sphere, shown for one blink per shot.
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe27a }),
  );
  flash.visible = false;
  r.scene.add(flash);

  const state = {
    mesh, x: start.x, z: start.z, angle: 0, vx: 0, vz: 0, speed: 0,
    mode: 'foot', car: null,
    health: PLAYER.health, maxHealth: PLAYER.health,
    armour: 50, maxArmour: 50, // armour absorbs damage before health does
    weapon: 'pistol', ammo: 24, // 1 fists · 2 pistol
    money: 1250, rep: 120,
    upgrades: { engine: false, armor: false, tires: false },
    punchCd: 0, shootCd: 0, flashTimer: 0, ramCd: 0,
    dead: false,
  };

  function nearestCar(vehicles, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const v of vehicles) {
      const d = Math.hypot(v.x - state.x, v.z - state.z);
      if (d < bestD) { best = v; bestD = d; }
    }
    return best;
  }

  return {
    // Live views of the state (getters, so the HUD/police/camera always read
    // the current values, never a stale copy).
    get mesh() { return mesh; },
    get x() { return state.x; },
    get z() { return state.z; },
    get angle() { return state.angle; },
    get vx() { return state.vx; },
    get vz() { return state.vz; },
    get speed() { return state.speed; },
    get mode() { return state.mode; },
    get car() { return state.car; },
    get health() { return state.health; },
    get maxHealth() { return state.maxHealth; },
    get armour() { return state.armour; },
    get maxArmour() { return state.maxArmour; },
    get weapon() { return state.weapon; },
    get ammo() { return state.ammo; },
    get money() { return state.money; },
    get rep() { return state.rep; },
    get upgrades() { return state.upgrades; },
    get dead() { return state.dead; },
    set dead(v) { state.dead = v; },
    get pos() { return { x: state.x, z: state.z }; },
    get inCar() { return state.mode === 'car'; },
    get vehicle() { return state.car; },

    update(dt, input, world, cameraYaw) {
      state.punchCd = Math.max(0, state.punchCd - dt);
      state.shootCd = Math.max(0, state.shootCd - dt);
      state.ramCd = Math.max(0, state.ramCd - dt);
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) flash.visible = false;
      }

      if (state.mode === 'car' && state.car) {
        const v = state.car;
        const { forward, strafe } = input.axes();
        driveVehicle(v, forward, -strafe, input.isDown('handbrake'), dt, state.upgrades);
        v.update(dt);
        state.x = v.x;
        state.z = v.z;
        state.angle = v.angle;
        state.speed = v.speed;
        state.vx = Math.cos(v.angle) * v.speed;
        state.vz = -Math.sin(v.angle) * v.speed;
        mesh.visible = false;
        audio.engine(Math.min(1, Math.abs(v.speed) / CAR.maxSpeed), true);
        // Hitting pedestrians while driving is a crime — and they fall.
        for (const p of world.peds.peds) {
          if (p.state !== 'down' && Math.hypot(p.x - state.x, p.z - state.z) < 2.6 && Math.abs(v.speed) > 6) {
            p.knockDown();
            world.police.addWanted(1);
            audio.crash();
          }
        }
        // Ramming a cop car hard raises the heat — once per contact, not
        // every step, or a tailgating cruiser maxes the wanted level instantly.
        for (const c of world.police.cops) {
          if (Math.hypot(c.vehicle.x - state.x, c.vehicle.z - state.z) < 4.5 && Math.abs(v.speed) > 20 && state.ramCd <= 0) {
            state.ramCd = 2;
            world.police.addWanted(1);
          }
        }
        if (input.wasPressed('enter')) this.exitCar();
        return;
      }

      // On foot: camera-relative movement.
      const { forward, strafe } = input.axes();
      const run = input.isDown('run');
      const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      // Camera-relative: W walks where the camera looks, D strafes to its
      // right. The camera looks along (sin yaw, cos yaw); its right is
      // (-cos yaw, sin yaw). (An earlier sign flip here made W walk toward
      // the camera instead of away from it.)
      const sin = Math.sin(cameraYaw);
      const cos = Math.cos(cameraYaw);
      let mx = (forward * sin - strafe * cos) * speed;
      let mz = (forward * cos + strafe * sin) * speed;
      const moving = Math.hypot(mx, mz) > 0.1;
      if (moving) {
        const len = Math.hypot(mx, mz);
        mx = (mx / len) * speed;
        mz = (mz / len) * speed;
        const targetAngle = Math.atan2(-mz, mx);
        let diff = targetAngle - state.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        state.angle += diff * Math.min(1, 12 * dt);
      }
      state.x += mx * dt;
      state.z += mz * dt;
      const p = { x: state.x, z: state.z };
      collideCircle(city.colliders, p, 0.6);
      state.x = p.x;
      state.z = p.z;
      state.vx = mx;
      state.vz = mz;
      state.speed = Math.hypot(mx, mz);
      mesh.position.set(state.x, mesh.position.y, state.z);
      mesh.rotation.y = state.angle;
      animateWalk(mesh, dt, moving ? speed : 0);
      audio.engine(0, false);

      if (input.wasPressed('enter')) this.tryEnterCar(world.vehicles);
      if (input.wasPressed('punch') && state.punchCd <= 0) this.punch(world);
      if (input.clicked() && state.shootCd <= 0) this.shoot(world);
    },

    tryEnterCar(vehicles) {
      const v = nearestCar(vehicles, 4.5);
      if (!v) return false;
      state.car = v;
      state.mode = 'car';
      state.speed = 0;
      // A parked car is free; a moving traffic car is a steal.
      if (Math.abs(v.speed) > 0.5) {
        // The driver bails out.
        if (v.mesh.userData.driver) v.mesh.userData.driver.visible = false;
        return 'steal';
      }
      return 'enter';
    },

    // Screenshot staging: put Rico straight into a car, or move him.
    enterShotCar(v) {
      state.car = v;
      state.mode = 'car';
      state.x = v.x;
      state.z = v.z;
      state.angle = v.angle;
      state.speed = v.speed;
      mesh.visible = false;
    },
    teleport(x, z, angle) {
      if (state.car) {
        state.car = null;
        state.mode = 'foot';
        mesh.visible = true;
      }
      state.x = x;
      state.z = z;
      state.angle = angle;
      state.speed = 0;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = angle;
    },

    exitCar() {
      if (!state.car) return;
      const v = state.car;
      state.x = v.x + Math.cos(v.angle + Math.PI / 2) * 3;
      state.z = v.z - Math.sin(v.angle + Math.PI / 2) * 3;
      state.mode = 'foot';
      state.car = null;
      state.speed = 0;
      mesh.visible = true;
      mesh.position.set(state.x, 0, state.z);
      audio.engine(0, false);
    },

    punch(world) {
      state.punchCd = 0.45;
      audio.punch();
      const range = PLAYER.punchRange;
      const targets = [...world.missions.rivals, ...world.peds.peds];
      for (const t of targets) {
        const tx = t.x ?? t.mesh.position.x;
        const tz = t.z ?? t.mesh.position.z;
        const dx = tx - state.x;
        const dz = tz - state.z;
        const d = Math.hypot(dx, dz);
        const facing = (dx * Math.cos(state.angle) + dz * -Math.sin(state.angle)) / (d || 1);
        if (d < range && facing > 0.3) {
          if (t.takeDamage) t.takeDamage(PLAYER.punchDamage);
          else if (t.knockDown) {
            t.knockDown();
            world.police.addWanted(1);
          }
          return true;
        }
      }
      return false;
    },

    shoot(world) {
      if (state.weapon !== 'pistol' || state.ammo <= 0) return false;
      state.ammo -= 1;
      state.shootCd = 0.28;
      audio.shot();
      flash.position.set(
        state.x + Math.cos(state.angle) * 1.1,
        1.45,
        state.z - Math.sin(state.angle) * 1.1,
      );
      flash.visible = true;
      state.flashTimer = 0.06;
      world.police.addWanted(1);
      const range = PLAYER.pistolRange;
      let best = null;
      let bestD = range;
      for (const t of world.missions.rivals) {
        const dx = t.x - state.x;
        const dz = t.z - state.z;
        const d = Math.hypot(dx, dz);
        const facing = (dx * Math.cos(state.angle) + dz * -Math.sin(state.angle)) / (d || 1);
        if (d < bestD && facing > 0.92) { best = t; bestD = d; }
      }
      if (best) best.takeDamage(PLAYER.pistolDamage);
      return !!best;
    },

    selectWeapon(w) {
      if (w === 'fists' || w === 'pistol') state.weapon = w;
    },
    damage(amount) {
      if (state.dead) return;
      // Armour takes the hit first; whatever gets through hits health.
      const absorbed = Math.min(state.armour, amount);
      state.armour -= absorbed;
      state.health -= (amount - absorbed);
      if (state.health <= 0) {
        state.health = 0;
        state.dead = true;
      }
    },
    heal(amount) {
      state.health = Math.min(state.maxHealth, state.health + amount);
    },
    revive(at) {
      state.dead = false;
      state.health = state.maxHealth;
      state.armour = state.maxArmour;
      state.ammo = 24;
      if (state.car) {
        state.car = null;
        state.mode = 'foot';
        mesh.visible = true;
      }
      state.x = at.x;
      state.z = at.z;
      mesh.position.set(at.x, 0, at.z);
    },
    addMoney(n) { state.money = Math.max(0, state.money + n); },
    addRep(n) { state.rep += n; },
    applyUpgrade(id) {
      state.upgrades[id] = true;
      if (id === 'armor') {
        state.maxHealth += 50;
        state.health = state.maxHealth;
        state.maxArmour = 100;
        state.armour = 100;
      }
    },
  };
}
