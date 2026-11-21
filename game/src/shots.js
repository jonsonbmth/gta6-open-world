// Sirena Bay — staged screenshot scenes. ?shot=chase|title|map|marina puts
// the game in a frozen, deterministic pose for one screenshot: the chase
// with the hero car big and every cruiser in its own lane, the title screen
// over a beach vista, the pause map open, and the marina crew at close
// range with every face toward the camera.
//
// The marina shot is the one the user judged last time: the camera stands
// about 4.5 m from the crew, the crew stand in a shallow arc facing it, and
// a dedicated key light from the camera lights every face. Heads render
// 50-70 px tall, and the face texture's eyes, nose and mouth are drawn big
// enough to read at that size.
//
// setupShot also writes window.__shotInfo: each car's screen-space box and
// each head's screen position and radius, so the playtest can assert that
// no two cars overlap on screen and every head is in frame.

(function () {
  'use strict';

  function project(camera, v3, w, h) {
    const v = v3.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
  }

  function carScreenBox(game, car, w, h) {
    // Project the 8 corners of a 4.6 x 1.6 x 2.0 box around the car.
    const c = car.group.position;
    const pts = [];
    for (const dx of [-1.0, 1.0]) {
      for (const dy of [0, 1.6]) {
        for (const dz of [-2.3, 2.3]) {
          const local = new THREE.Vector3(dx, dy, dz).applyQuaternion(car.group.quaternion);
          pts.push(project(game.camera, new THREE.Vector3(c.x + local.x, c.y + local.y, c.z + local.z), w, h));
        }
      }
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach((p) => {
      if (p.behind) return;
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }

  function collectShotInfo(game, cars, heads) {
    const w = game.renderer.domElement.width;
    const h = game.renderer.domElement.height;
    const info = { cars: [], heads: [], width: w, height: h };
    cars.forEach((c) => {
      info.cars.push({ name: c.name, box: carScreenBox(game, c.car, w, h) });
    });
    heads.forEach((hd) => {
      const wp = new THREE.Vector3();
      hd.head.getWorldPosition(wp);
      const p = project(game.camera, wp, w, h);
      // Screen radius of the head: project a point one head-radius above.
      const wp2 = wp.clone();
      wp2.y += 0.19;
      const p2 = project(game.camera, wp2, w, h);
      info.heads.push({ name: hd.name, x: p.x, y: p.y, r: Math.abs(p2.y - p.y), behind: p.behind });
    });
    window.__shotInfo = info;
    return info;
  }

  function lookAt(game, pos, target) {
    game.camera.position.set(pos[0], pos[1], pos[2]);
    game.camera.lookAt(target[0], target[1], target[2]);
    game.camera.updateMatrixWorld();
  }

  function setupChase(game) {
    const G = game;
    G.setDriving(true);
    // Hero: centre lane, facing north (-Z), big in frame.
    G.placeCar(G.playerCar, 0.5, 0, -2, Math.PI);
    G.playerSpeed = 112;
    // Cruisers: four units staggered AHEAD of the hero, each in its own
    // lane with clear gaps. Nothing sits beside the camera: a car next to
    // the lens fills the frame and reads as a collision.
    const spots = [
      { unit: 0, x: -5.8, z: -21 },
      { unit: 1, x: 5.8, z: -11 },
      { unit: 2, x: -1.0, z: -32 },
      { unit: 3, x: 2.6, z: -30 },
    ];
    spots.forEach((s) => {
      G.placeCar(G.cruisers[s.unit], s.x, 0, s.z, Math.PI);
    });
    // The roadblock unit waits further up the road, sideways.
    G.placeCar(G.cruisers[4], -4.0, 0, -42, Math.PI / 2);
    // Helicopter low and ahead, inside the frame, spotlight pooling on the
    // hero. (A heli at 24 m sits above the frame's top edge; at 13.5 m it
    // is still cut off — 11 m and 30 m ahead puts it in the upper frame.)
    G.placeHeli(3, 11, -30, new THREE.Vector3(0.5, 0, -2));
    // Traffic ahead, pedestrians on the sidewalks (one panicking). All of
    // them stay well ahead of the camera: a pedestrian next to the lens
    // renders huge and reads as a giant.
    G.placeTraffic(0, 4.2, -40, Math.PI);
    G.placeTraffic(1, -4.2, -48, Math.PI);
    G.posePedestrian(0, 9.8, -20, 'panic');
    G.posePedestrian(1, -9.8, -10, 'walk');
    G.posePedestrian(2, 9.8, -30, 'walk');
    // A key light from behind the camera: the hero's rear faces the lens,
    // and without it the car falls into shade.
    if (!G.chaseKey) {
      G.chaseKey = new THREE.DirectionalLight(0xfff2dd, 1.4);
      G.scene.add(G.chaseKey);
      G.chaseKeyTarget = new THREE.Object3D();
      G.scene.add(G.chaseKeyTarget);
      G.chaseKey.target = G.chaseKeyTarget;
    }
    G.chaseKey.position.set(4, 6, 12);
    G.chaseKeyTarget.position.set(0, 1, -4);
    // Camera: close rear three-quarter on the hero — the hero fills a
    // quarter of the frame width, all four cruisers stay visible, and the
    // aim is raised so the helicopter sits in the top of the frame.
    lookAt(G, [4.2, 3.1, 7.0], [0, 2.2, -6]);
    G.showHud();
    G.setPopup('drift', 'DRIFT x3');
    G.setPopup2('nearmiss', 'NEAR MISS +$250');
    G.state.stars = 4;
    G.state.speed = 112;
    G.state.district = 'SUNSET QUAY';
    G.state.street = 'Mermaid Mile';
    const cars = [
      { name: 'hero', car: G.playerCar },
      { name: 'CONDOR-2', car: G.cruisers[0] },
      { name: 'HARRIER-6', car: G.cruisers[1] },
      { name: 'EGRET-3', car: G.cruisers[2] },
      { name: 'KESTREL-5', car: G.cruisers[3] },
    ];
    collectShotInfo(G, cars, []);
  }

  function setupTitle(game) {
    const G = game;
    // A beach vista: hero car parked on the boulevard, palms, sea, city.
    G.placeCar(G.playerCar, 4, 0, -18, Math.PI * 0.92);
    G.placeTraffic(0, -3.4, -40, Math.PI);
    G.posePedestrian(0, 9.6, -10, 'walk');
    G.posePedestrian(1, -9.8, -2, 'walk');
    lookAt(G, [16, 5.5, 6], [-6, 1.5, -30]);
    G.showTitle();
    collectShotInfo(G, [{ name: 'hero', car: G.playerCar }], []);
  }

  function setupMap(game) {
    const G = game;
    G.placeCar(G.playerCar, 0.5, 0, -2, Math.PI);
    lookAt(G, [5.6, 3.9, 10.5], [0, 1.0, -4]);
    G.showHud();
    G.showMap();
    collectShotInfo(G, [{ name: 'hero', car: G.playerCar }], []);
  }

  function setupMarina(game) {
    const G = game;
    G.setDriving(false);
    // The crew stand in a shallow arc on the dock, 4-6 m from the camera,
    // every one facing the camera so every face is front-lit and visible.
    // Dock top is y = 0.6. Figures are built facing +Z (south); the camera
    // stands north of them, so each one turns PI to face the lens.
    const crew = G.marinaCrew;
    const spots = [
      { i: 0, x: -32.8, z: 113.6, ry: 0.35, pose: 'carry' },   // crate carrier, mid-stride
      { i: 1, x: -31.6, z: 113.2, ry: -0.05, pose: 'wave' },   // waver, arm up at the boat
      { i: 2, x: -30.2, z: 114.6, ry: 0.35, pose: 'talk' },    // talker A, gesturing
      { i: 3, x: -29.0, z: 114.2, ry: -0.35, pose: 'talk2' },  // talker B, answering
      { i: 4, x: -27.8, z: 113.4, ry: 0.15, pose: 'kneel' },   // mechanic by the engine
      { i: 5, x: -32.4, z: 114.8, ry: -0.35, pose: 'walk' },   // walker with a duffel
    ];
    spots.forEach((s) => {
      const c = crew[s.i];
      c.group.position.set(s.x, 0.6, s.z);
      c.group.rotation.y = Math.PI + s.ry;
      G.poseCrew(s.i, s.pose);
    });
    // A dedicated key light from the camera, so no face falls into shadow.
    if (!G.marinaKey) {
      G.marinaKey = new THREE.DirectionalLight(0xfff2dd, 1.6);
      G.scene.add(G.marinaKey);
      G.marinaKeyTarget = new THREE.Object3D();
      G.scene.add(G.marinaKeyTarget);
      G.marinaKey.target = G.marinaKeyTarget;
    }
    G.marinaKey.position.set(-30, 4.5, 106);
    G.marinaKeyTarget.position.set(-30, 1.2, 114);
    // Camera close on the arc: heads 50-70 px tall in the 1280x720 frame.
    // Far enough back that the whole arc fits between the HUD panels.
    lookAt(G, [-30.1, 2.5, 106.6], [-30.1, 1.4, 114.5]);
    G.showHud();
    G.state.speed = 0;
    G.state.district = 'THE MARINA';
    G.state.street = 'Mermaid Mile';
    const heads = crew.map((c, i) => ({ name: 'crew' + i, head: c.pivots.head }));
    collectShotInfo(G, [], heads);
  }

  function setupShot(name, game) {
    if (name === 'chase') setupChase(game);
    else if (name === 'title') setupTitle(game);
    else if (name === 'map') setupMap(game);
    else if (name === 'marina') setupMarina(game);
    else throw new Error('unknown shot: ' + name);
    game.shotName = name;
  }

  window.SB.shots = { setupShot };
})();
