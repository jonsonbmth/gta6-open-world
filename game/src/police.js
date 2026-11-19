// Wanted system + police: stars rise when the player commits crimes, police
// interceptors spawn and chase, and standing still next to them gets the
// player busted.

import { CFG } from './config.js';
import { buildPoliceCar } from './cars.js';

function glowSprite(color) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(4.5);
  return s;
}

export function createPolice(scene) {
  const cars = [];
  let wanted = 0;
  let lastCrime = -100;
  let spawnTimer = 0;
  let bustTimer = 0;
  let flash = 0;

  function spawnNear(playerPos, rng) {
    // Pick a road point 60–110 m from the player.
    for (let tries = 0; tries < 12; tries++) {
      const av = rng.pick(CFG.avenues);
      const st = rng.pick(CFG.streets);
      const onAvenue = rng.chance(0.5);
      const x = onAvenue ? av.x : rng.range(-280, 220);
      const z = onAvenue ? rng.range(-280, 280) : st.z;
      const d = Math.hypot(x - playerPos.x, z - playerPos.z);
      if (d > 55 && d < 130) {
        const built = buildPoliceCar();
        const redGlow = glowSprite('rgba(255,40,40,0.9)');
        redGlow.position.set(-0.3, 1.7, 0.1);
        const blueGlow = glowSprite('rgba(60,90,255,0.9)');
        blueGlow.position.set(0.3, 1.7, 0.1);
        built.group.add(redGlow, blueGlow);
        const car = {
          ...built,
          redGlow,
          blueGlow,
          pos: new THREE.Vector3(x, 0, z),
          heading: Math.atan2(playerPos.x - x, playerPos.z - z),
          speed: 0,
        };
        built.group.position.copy(car.pos);
        built.group.rotation.y = car.heading + Math.PI;
        scene.add(built.group);
        cars.push(car);
        return;
      }
    }
  }

  function update(dt, player, colliders, rng, time) {
    flash = time * 9;
    const want = Math.min(wanted + 1, CFG.police.maxCars);

    // Spawn staggered while under strength.
    if (wanted > 0 && cars.length < want) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = 1.6;
        spawnNear(player.pos, rng);
      }
    }

    // Wanted decays if the player keeps clean and out of sight.
    const nearest = cars.reduce(
      (m, c) => Math.min(m, c.pos.distanceTo(player.pos)),
      Infinity,
    );
    if (wanted > 0 && time - lastCrime > 25 && nearest > 55) {
      wanted -= 1;
      lastCrime = time;
    }

    let busted = false;
    for (const car of cars) {
      // Pursuit steering toward the player.
      const dx = player.pos.x - car.pos.x;
      const dz = player.pos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const targetSpeed = wanted > 0 ? CFG.police.chaseSpeed : 16;
      car.speed += (targetSpeed - car.speed) * Math.min(1, 0.9 * dt);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;

      // Slide along buildings.
      const r = 1.7;
      for (const c of colliders) {
        const cx = Math.max(c.minX, Math.min(car.pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(car.pos.z, c.maxZ));
        const ox = car.pos.x - cx;
        const oz = car.pos.z - cz;
        const d2 = ox * ox + oz * oz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.001;
          car.pos.x += (ox / d) * (r - d);
          car.pos.z += (oz / d) * (r - d);
          car.speed *= 0.6;
        }
      }
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading + Math.PI;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.33;

      // Light bar flash: alternating red / blue.
      const on = Math.sin(flash) > 0;
      car.redLens.material.emissiveIntensity = on ? 4 : 0.4;
      car.blueLens.material.emissiveIntensity = on ? 0.4 : 4;
      car.redGlow.material.opacity = on ? 0.85 : 0.08;
      car.blueGlow.material.opacity = on ? 0.08 : 0.85;

      // Busted: slow, and a cruiser right next to the player.
      if (wanted > 0 && player.speed < 1.6 && dist < CFG.police.ramRange + 2) {
        bustTimer += dt;
        if (bustTimer > CFG.police.bustTime) busted = true;
      }
    }
    if (!(wanted > 0 && player.speed < 1.6 && nearest < CFG.police.ramRange + 2)) {
      bustTimer = 0;
    }

    // When the heat is off, cruisers leave and despawn at range.
    if (wanted === 0) {
      for (let i = cars.length - 1; i >= 0; i--) {
        if (cars[i].pos.distanceTo(player.pos) > 130) {
          scene.remove(cars[i].group);
          cars.splice(i, 1);
        }
      }
    }
    return { busted, nearest, bustTimer };
  }

  return {
    get wanted() {
      return wanted;
    },
    set wanted(v) {
      wanted = Math.max(0, Math.min(5, v));
    },
    get cars() {
      return cars;
    },
    addWanted(n, time) {
      wanted = Math.max(0, Math.min(5, wanted + n));
      lastCrime = time;
    },
    clearWanted() {
      wanted = 0;
    },
    update,
  };
}
