// Screenshot staging: ?shot=chase|title|map|marina sets up an exact,
// reproducible scene so the dossier screenshots show the game at its best.
// Every shot is a real render of the game's own code — no compositing.
import * as THREE from 'three';
import { S, SHOT, CITY } from './state.js';
import { makeCar } from './vehicles.js';
import { spawnUnit } from './police.js';
import { makePerson, peds } from './people.js';
import { showDialogue, floatText, setMode, drawBigMap } from './hud.js';
import { stageSay } from './missions.js';

// Called once, after the world is built. Returns per-frame shot behaviour.
export function stageShot(W) {
  if (!SHOT) return null;
  const { scene, camera } = W;

  if (SHOT === 'chase') {
    // COVER: night chase down Lumen Avenue — hero car, 2 police, heli, HUD.
    S.mode = 'playing';
    S.wanted = 3;
    S.money = 42780; S.rep = 320; S.health = 82; S.armour = 45;
    S.mission = 0; S.stage = 0;
    // hero car mid-avenue, heading north toward the skyline
    W.heroCar.x = 1.5; W.heroCar.z = 130; W.heroCar.heading = 0.06;
    W.heroCar.speed = 34; // ~122 km/h and climbing
    W.heroCar.condition = 95;
    W.enterCar(W.heroCar);
    // two police cruisers AHEAD of the hero, in frame, light bars strobing
    const u1 = spawnUnit(scene, 'UNIT 7', 7.5, 88);
    u1.heading = Math.PI - 0.15; u1.speed = 30; u1.status = 'PURSUIT';
    const u2 = spawnUnit(scene, 'UNIT 12', -5.5, 66);
    u2.heading = Math.PI + 0.1; u2.speed = 28; u2.status = 'CLOSING IN';
    // traffic ahead for depth
    const t1 = makeCar(scene, 'taxi', -4.5, 60, 0); t1.speed = 12;
    const t2 = makeCar(scene, 'sedan', 4.5, 20, 0); t2.speed = 11;
    W.shotTraffic = [t1, t2];
    // keep the throttle down so the chase stays fast
    W.shotDrive = true;
    W.snapCam = true; // camera snaps behind the car on the first frame
    setMode('playing');
    showDialogue('lena', 'Lose them before the bridge, Rico. The Comet is worth more than my freedom — barely.', 30);
    // floating action text, re-fired so one is always on screen for the shot
    setInterval(() => floatText('NEAR MISS  +$250'), 1000);
    return { drive: true };
  }

  if (SHOT === 'title') {
    // TITLE: skyline at night, hero car parked under the neon, logo on top.
    S.mode = 'title';
    W.heroCar.x = 5.5; W.heroCar.z = 42; W.heroCar.heading = -0.4;
    W.heroCar.speed = 0;
    camera.position.set(0, 4.2, 62);
    camera.lookAt(0, 7, -100);
    setMode('title');
    const ts = document.getElementById('ts-save');
    if (ts) ts.textContent = 'SAVE FOUND — DAY 1 · $42,780 · JOB 1/7 (ENTER TO CONTINUE)';
    return { staticCam: true };
  }

  if (SHOT === 'map') {
    // MAP: full city map with districts, markers and the mission diamond.
    S.mode = 'playing';
    setMode('map');
    drawBigMap(W.player.x, W.player.z);
    return { staticCam: true };
  }

  if (SHOT === 'marina') {
    // MARINA: on foot among the docks — boats, crates, peds, parked cars.
    S.mode = 'playing';
    S.wanted = 0;
    S.mission = 1; S.stage = 0;
    W.exitCar();
    W.player.x = 6; W.player.z = 262; W.player.heading = Math.PI * 0.95;
    W.player.mesh.position.set(6, 0, 262);
    W.player.mesh.rotation.y = W.player.heading;
    // two parked cars in frame
    makeCar(scene, 'sedan', -12, 254, 1.57, 0xb8b0a0);
    makeCar(scene, 'van', 22, 250, -1.57, 0x5a6e8a);
    // three pedestrians on the quay, one with an umbrella
    for (const [px, pz, umb] of [[-8, 268, true], [14, 272, false], [-2, 280, false]]) {
      const m = makePerson(0xc98d5f, 0x2e8f6e, umb);
      m.position.set(px, 0, pz); m.rotation.y = Math.PI * (0.5 + Math.random());
      scene.add(m);
      peds.push({ mesh: m, x: px, z: pz, heading: m.rotation.y, speed: 0, state: 'walk', panicT: 0, target: null, waitT: 30 });
    }
    W.snapCam = true; // camera snaps behind Rico on the first frame
    // staged 3/4 camera: Rico left-of-centre, docks + boats + water in frame
    camera.position.set(12, 2.8, 254);
    camera.lookAt(-4, 1.2, 280);
    W.staticCam = true;
    setMode('playing');
    showDialogue('dario', 'Package is in the blue container, Pier 9. Do not open it. Seriously.', 30);
    return { marinaCam: true };
  }
  return null;
}
