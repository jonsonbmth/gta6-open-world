// Staged shots: chase, title, map and marina. Each shot places the camera
// and the actors, then collects window.__shotInfo — the screen boxes of
// every car and the screen position + radius of every head — so the
// playtest runner can verify separation, hero size and face readability.

import { SUNSET } from './sky.js';

const W = 1280;
const H = 720;

function projectBox(camera, matrixWorld, min, max) {
  const v = new THREE.Vector3();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let behind = false;
  for (const [x, y, z] of [
    [min.x, min.y, min.z], [max.x, min.y, min.z],
    [min.x, max.y, min.z], [max.x, max.y, min.z],
    [min.x, min.y, max.z], [max.x, min.y, max.z],
    [min.x, max.y, max.z], [max.x, max.y, max.z],
  ]) {
    v.set(x, y, z).applyMatrix4(matrixWorld).project(camera);
    if (v.z > 1) behind = true;
    x0 = Math.min(x0, v.x);
    y0 = Math.min(y0, v.y);
    x1 = Math.max(x1, v.x);
    y1 = Math.max(y1, v.y);
  }
  const sx0 = ((x0 + 1) / 2) * W;
  const sx1 = ((x1 + 1) / 2) * W;
  const sy0 = ((1 - y1) / 2) * H;
  const sy1 = ((1 - y0) / 2) * H;
  return { x0: sx0, y0: sy0, x1: sx1, y1: sy1, w: sx1 - sx0, h: sy1 - sy0, behind };
}

function projectHead(camera, headGroup) {
  const p = new THREE.Vector3();
  headGroup.getWorldPosition(p);
  const dist = p.distanceTo(camera.position);
  const v = p.clone().project(camera);
  const x = ((v.x + 1) / 2) * W;
  const y = ((1 - v.y) / 2) * H;
  // Screen radius of a 0.23 m sphere at this distance, FOV 55 vertical.
  const r = (0.23 * (H / 2)) / (Math.tan((55 * Math.PI) / 360) * dist);
  return { x, y, r, behind: v.z > 1 };
}

const CAR_MIN = new THREE.Vector3(-1.05, 0, -2.3);
const CAR_MAX = new THREE.Vector3(1.05, 1.5, 2.3);

function collectCars(camera, cars) {
  return cars.map((c) => {
    // The matrices are still identity before the first render: force an
    // update or every car projects as if it were at the origin.
    c.group.updateWorldMatrix(true, false);
    return {
      name: c.name,
      box: projectBox(camera, c.group.matrixWorld, CAR_MIN, CAR_MAX),
    };
  });
}

function collectHeads(camera, crew) {
  return crew.map((p) => ({
    name: p.userData.name,
    ...projectHead(camera, p.userData.head),
  }));
}

function baseInfo() {
  return {
    sunset: {
      sunColor: SUNSET.sunColor,
      elevationDeg: SUNSET.elevationDeg,
      horizonColor: SUNSET.horizonColor,
    },
  };
}

// Chase staging, shared by the chase shot and the map shot: the hero big
// in the lower frame (3/4 rear view, fov 45), all four cruisers AHEAD of
// it spread across the lanes and the depth, and the heli low enough to
// read in the frame with its spotlight cone sweeping down to the hero.
// Nothing sits behind the hero — cars back there fall under the camera's
// near plane and vanish.
function stageChase(world) {
  const { camera, hero, cruisers, heli } = world;
  hero.group.position.set(-1.0, 0, 14);
  hero.group.rotation.y = 0.15;
  hero.group.visible = true;
  const spots = [
    { car: cruisers[0], x: -5.5, z: 6 },
    { car: cruisers[1], x: 4.5, z: -2 },
    { car: cruisers[2], x: -3.5, z: -12 },
    { car: cruisers[3], x: 5.5, z: -22 },
  ];
  for (const s of spots) {
    s.car.group.position.set(s.x, 0, s.z);
    s.car.group.rotation.y = 0;
    s.car.group.visible = true;
  }
  heli.group.position.set(12, 13, -20);
  heli.group.visible = true;
  camera.fov = 45;
  camera.position.set(-1.5, 4.0, 24.5);
  camera.lookAt(-1, 1.4, -8);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

export function setupShot(name, world) {
  const { camera, hero, cruisers, heli, crew, traffic } = world;
  const info = baseInfo();

  if (name === 'chase') {
    stageChase(world);
    info.cars = collectCars(camera, [
      { name: 'hero', group: hero.group },
      ...cruisers.map((c, i) => ({ name: 'cruiser' + (i + 1), group: c.group })),
    ]);
  } else if (name === 'title') {
    // Golden-hour vista: beach, ferris wheel and sunset behind the title.
    hero.group.position.set(-4, 0, 16);
    hero.group.rotation.y = 0.5;
    for (const c of cruisers) c.group.visible = false;
    heli.group.visible = false;
    camera.position.set(-6, 3.4, 28);
    camera.lookAt(-58, 5, -58);
    camera.updateMatrixWorld(true);
    info.cars = collectCars(camera, [{ name: 'hero', group: hero.group }]);
  } else if (name === 'map') {
    // Same staging as chase; the map overlay opens on top.
    stageChase(world);
    info.cars = collectCars(camera, [
      { name: 'hero', group: hero.group },
      ...cruisers.map((c, i) => ({ name: 'cruiser' + (i + 1), group: c.group })),
    ]);
  } else if (name === 'marina') {
    // The six crew on the quay, docks and boats behind them, side-lit by
    // the setting sun. Faces point at the camera (faces are on +Z, so
    // ry ~ PI); the formation is compressed to fit between the left HUD
    // column (ends x=334) and the right crew panel (starts x=1046).
    const spots = [
      { p: crew[0], x: -57, z: 82.5, ry: Math.PI + 0.2 }, // Mara, carrying
      { p: crew[1], x: -54, z: 82.0, ry: Math.PI - 0.1 }, // Tomas, waving
      { p: crew[2], x: -52.5, z: 84.0, ry: Math.PI + 0.35 }, // Rosa, crouched at engine
      { p: crew[3], x: -59, z: 84.0, ry: Math.PI - 0.35 }, // Dario, talking
      { p: crew[4], x: -56.5, z: 85.0, ry: Math.PI + 0.35 }, // Luz, talking back
      { p: crew[5], x: -55, z: 84.5, ry: Math.PI + 0.5 }, // Paco, walking past
    ];
    for (const s of spots) {
      s.p.position.set(s.x, 0, s.z);
      s.p.rotation.y = s.ry;
      s.p.visible = true;
    }
    hero.group.visible = false;
    for (const c of cruisers) c.group.visible = false;
    heli.group.visible = false;
    camera.position.set(-55, 2.1, 75.5);
    camera.lookAt(-55, 1.25, 85);
    camera.updateMatrixWorld(true);
    info.heads = collectHeads(camera, crew);
  }

  // Traffic keeps its ambient positions in every shot.
  void traffic;
  window.__shotInfo = info;
  return info;
}
