// The wanted system: heat 0–5 stars, named police units that chase the player,
// and the AIR-1 helicopter with a narrow searchlight cone.
//
// Heat rises when the player speeds through the city, hits things, or a job stage
// demands it; it cools when the player breaks line of sight. setWanted sets heat
// directly (jobs use it) and the level follows.
import * as THREE from 'three';
import { UNITS } from './config.js';
import { makePoliceCar } from './cars.js';

const HEAT_PER_STAR = 20;

export function createPolice(scene, random, textures) {
  let wanted = 0;
  let heat = 0;
  let blink = 0;
  const units = []; // { car, speed, target, name, state }
  let heli = null;
  let heliAngle = 0;
  let cone = null;

  function spawnUnit(name, x, z, heading) {
    const car = makePoliceCar(random, textures);
    car.position.set(x, 0, z);
    car.rotation.y = heading;
    scene.add(car);
    const unit = { car, name, speed: 0, state: 'chase', sirenPhase: random() * Math.PI * 2 };
    units.push(unit);
    return unit;
  }

  function makeHeli() {
    const heliGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3048, roughness: 0.4, metalness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.4, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 4.2), bodyMat);
    body.castShadow = true;
    heliGroup.add(body);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.9, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.1, metalness: 0.9 }),
    );
    glass.position.set(0, 0.25, 1.6);
    heliGroup.add(glass);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), bodyMat);
    tail.position.set(0, 0.3, -3.6);
    heliGroup.add(tail);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.8), whiteMat);
    tailFin.position.set(0, 0.8, -5.1);
    heliGroup.add(tailFin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), bodyMat);
    mast.position.y = 1.0;
    heliGroup.add(mast);
    const rotor = new THREE.Group();
    for (let i = 0; i < 2; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.5 }));
      blade.rotation.y = (i * Math.PI) / 2;
      rotor.add(blade);
    }
    rotor.position.y = 1.4;
    heliGroup.add(rotor);
    heliGroup.userData.rotor = rotor;
    // Searchlight cone: narrow (radius ~2.4 at the ground), faint, FrontSide only.
    const coneGeo = new THREE.ConeGeometry(2.4, 24, 20, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c0, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
    });
    cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, -12, 0);
    cone.rotation.x = Math.PI; // apex up at the heli, wide end down
    heliGroup.add(cone);
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, -23.8, 0);
    heliGroup.add(spot);
    heliGroup.userData.spot = spot;
    return heliGroup;
  }

  function setWanted(level) {
    wanted = Math.max(0, Math.min(5, Math.round(level)));
    heat = wanted * HEAT_PER_STAR;
    // Spawn or remove units to match the level (1 unit per star, max 4 cars).
    const wantCars = wanted === 0 ? 0 : Math.min(4, wanted);
    while (units.length < wantCars) {
      const angle = random() * Math.PI * 2;
      spawnUnit(UNITS[units.length % UNITS.length], Math.cos(angle) * 40, Math.sin(angle) * 40, angle);
    }
    while (units.length > wantCars) {
      const unit = units.pop();
      scene.remove(unit.car);
    }
    if (wanted >= 3 && !heli) {
      heli = makeHeli();
      scene.add(heli);
    }
    if (wanted < 3 && heli) {
      scene.remove(heli);
      heli = null;
      cone = null;
    }
  }

  // A unit's car is placed in the world the moment it spawns (never at origin).
  function placeUnit(index, x, z, heading) {
    if (index < units.length) {
      units[index].car.position.set(x, 0, z);
      units[index].car.rotation.y = heading;
      units[index].speed = 0;
    }
  }

  function update(dt, player, frozen) {
    blink += dt;
    const playerPos = player.position;
    for (const unit of units) {
      const car = unit.car;
      // Steer toward the player, drive, and wobble the siren lights.
      const dx = playerPos.x - car.position.x;
      const dz = playerPos.z - car.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - car.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (!frozen) {
        car.rotation.y += THREE.MathUtils.clamp(diff, -1.6 * dt, 1.6 * dt);
        unit.speed = THREE.MathUtils.clamp(unit.speed + (dist > 14 ? 14 : -10) * dt, 0, 26);
        car.position.x += Math.sin(car.rotation.y) * unit.speed * dt;
        car.position.z += Math.cos(car.rotation.y) * unit.speed * dt;
      }
      // Alternating red/blue flash on the light bar.
      unit.sirenPhase += dt * 9;
      const redOn = Math.sin(unit.sirenPhase) > 0;
      car.traverse((node) => {
        if (node.isMesh && node.material && node.material.emissive) {
          if (node.material.emissive.getHex() === 0xff1a1a) node.material.emissiveIntensity = redOn ? 3.5 : 0.4;
          if (node.material.emissive.getHex() === 0x2255ff) node.material.emissiveIntensity = redOn ? 0.4 : 3.5;
        }
      });
    }
    if (heli) {
      heliAngle += dt * 0.25;
      const radius = 26;
      const hx = playerPos.x + Math.cos(heliAngle) * radius;
      const hz = playerPos.z + Math.sin(heliAngle) * radius;
      if (!frozen) {
        heli.position.set(hx, 30, hz);
        heli.lookAt(playerPos.x, 0, playerPos.z);
      }
      heli.userData.rotor.rotation.y += dt * 22;
    }
    // Heat cools slowly when the player is far from every unit.
    if (!frozen && wanted > 0) {
      let nearest = Infinity;
      for (const unit of units) {
        const d = unit.car.position.distanceTo(playerPos);
        if (d < nearest) nearest = d;
      }
      if (nearest > 60) {
        heat = Math.max(0, heat - dt * 1.5);
        const level = Math.floor(heat / HEAT_PER_STAR);
        if (level !== wanted) setWanted(level);
      }
    }
  }

  return {
    get wanted() { return wanted; },
    get heat() { return heat; },
    get units() { return units; },
    get heli() { return heli; },
    get blink() { return blink; },
    setBlink(value) { blink = value; },
    setWanted,
    placeUnit,
    addHeat(amount) {
      heat = Math.min(5 * HEAT_PER_STAR, heat + amount);
      const level = Math.floor(heat / HEAT_PER_STAR);
      if (level !== wanted) setWanted(level);
    },
    update,
  };
}
