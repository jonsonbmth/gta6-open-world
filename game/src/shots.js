// shots.js — the staged shots for AURELIA BAY. Each shot (?shot=chase,
// title, map, marina) places the camera, the cars and the HUD for one
// composed frame, renders it ONCE (no animation loop — SwiftShader is
// slow, and a single frame is all a screenshot needs), and measures the
// frame into window.__shotInfo: the cars' screen boxes, the marina
// crew's head positions, the sky facts and the renderer stats. The
// playtest asserts on those measurements.
//
// THE V25r3 FIX: the marina shot shows the FULL HUD, like the chase
// shot. The V25r2 marina screenshot had no HUD at all and looked like a
// tech demo; the marina is a game screen, so it carries the game HUD.

(function () {
  'use strict';

  var W = 1280;
  var H = 720;

  // The chase positions of the four cruisers: staggered down the street
  // so their screen boxes never overlap each other or the hero.
  var CRUISER_SPOTS = [
    { name: 'FALCON-2', x: -3.2, z: -22 },
    { name: 'OSPREY-7', x: 3.0, z: -30 },
    { name: 'HERON-4', x: -2.0, z: -42 },
    { name: 'KITE-9', x: 5.5, z: -68 },
  ];

  function setCamera(camera, pos, look, fov) {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(look[0], look[1], look[2]);
    if (fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
  }

  function projectToScreen(camera, v3) {
    var v = v3.clone().project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * W,
      y: (-v.y * 0.5 + 0.5) * H,
      behind: v.z > 1,
    };
  }

  // The screen box of a car: project the 8 corners of its world bounding
  // box and take the min/max. That is the box the playtest checks for
  // size, framing and separation.
  function carScreenBox(game, carGroup) {
    var box = new THREE.Box3().setFromObject(carGroup);
    var min = box.min;
    var max = box.max;
    var corners = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
    ];
    var x0 = Infinity;
    var y0 = Infinity;
    var x1 = -Infinity;
    var y1 = -Infinity;
    corners.forEach(function (c) {
      var p = projectToScreen(game.camera, c);
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }

  // The marina crew's heads: screen position + projected head radius.
  function crewHeads(game) {
    var camera = game.camera;
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    return game.crew.map(function (person) {
      var headPos = new THREE.Vector3();
      person.head.getWorldPosition(headPos);
      var p = projectToScreen(camera, headPos);
      var edge = headPos.clone().addScaledVector(right, person.headRadius);
      var pe = projectToScreen(camera, edge);
      var r = Math.abs(pe.x - p.x);
      return { name: person.name, x: p.x, y: p.y, r: r, behind: p.behind };
    });
  }

  function computeShotInfo(game, shot) {
    var info = {
      shot: shot,
      sky: game.skyInfo,
      renderer: {
        calls: game.renderer.info.render.calls,
        triangles: game.renderer.info.render.triangles,
        geometries: game.renderer.info.memory.geometries,
        textures: game.renderer.info.memory.textures,
      },
    };
    if (shot === 'chase' || shot === 'map') {
      var cars = [{ name: 'hero', box: carScreenBox(game, game.hero.group) }];
      game.cruisers.forEach(function (c) {
        cars.push({ name: c.name, box: carScreenBox(game, c.group) });
      });
      info.cars = cars;
    }
    if (shot === 'marina') {
      info.heads = crewHeads(game);
    }
    window.__shotInfo = info;
    return info;
  }

  // Place the hero and the cruisers for a driving shot.
  function placeTraffic(game) {
    game.hero.group.position.set(0, 0, 0.5);
    game.hero.group.rotation.y = Math.PI / 2; // facing down the street
    game.cruisers.forEach(function (c, i) {
      var spot = CRUISER_SPOTS[i];
      c.group.position.set(spot.x, 0, spot.z);
      c.group.rotation.y = Math.PI / 2;
    });
    game.heli.group.position.set(0.5, 19, -38);
    game.heli.group.rotation.y = 0; // nose down the street
    game.heli.group.visible = true;
  }

  function stageChase(game) {
    placeTraffic(game);
    setCamera(game.camera, [4.6, 2.9, 8.6], [0, 1.1, -14], 50);
    window.AB.hud.hideTitle();
    window.AB.hud.closeMap();
    window.AB.hud.showHUD();
    window.AB.hud.setSpeed(118);
    window.AB.hud.setPopup(
      '<span class="popup-big">DRIFT x3</span><br>' +
      '<span class="popup-small">NEAR MISS +$250</span>',
    );
  }

  // Close-up of the hero car for the hero-zoom preview: a clean side
  // profile, no HUD — the full sculpted silhouette (sloped nose,
  // curved roofline, tapered tail, spoked wheels filling the arches,
  // wing spoiler) fills the frame, nose to the right.
  function stageHeroZoom(game) {
    placeTraffic(game);
    // Shot-only key light: the hero sits in building shade at this spot,
    // so light its camera side directly for the close-up.
    var key = new THREE.DirectionalLight(0xfff2d8, 1.6);
    key.position.set(14, 8, 6);
    key.target.position.set(0, 0.7, 0.5);
    game.scene.add(key);
    game.scene.add(key.target);
    setCamera(game.camera, [6.2, 1.4, 0.5], [0, 0.7, 0.5], 50);
    window.AB.hud.hideTitle();
    window.AB.hud.hideHUD();
    window.AB.hud.closeMap();
  }

  function stageTitle(game) {
    placeTraffic(game);
    setCamera(game.camera, [0.5, 1.7, 16], [0, 2.2, -30], 50);
    window.AB.hud.showTitle();
    window.AB.hud.hideHUD();
    window.AB.hud.closeMap();
  }

  function stageMap(game) {
    placeTraffic(game);
    setCamera(game.camera, [4.6, 2.9, 8.6], [0, 1.1, -14], 50);
    window.AB.hud.hideTitle();
    window.AB.hud.showHUD();
    window.AB.hud.setSpeed(118);
    window.AB.hud.openMap();
  }

  function stageMarina(game) {
    placeTraffic(game);
    // The marina camera: close enough that every crew head reads at
    // >=15px, wide enough that the six-person row fits the frame.
    setCamera(game.camera, [-31.5, 1.9, 0.5], [-39, 1.35, 0], 50);
    window.AB.hud.hideTitle();
    window.AB.hud.closeMap();
    // FULL HUD on the marina shot (the V25r3 fix).
    window.AB.hud.showHUD();
    window.AB.hud.setSpeed(0);
    window.AB.hud.setPopup(
      '<span class="popup-big">GILDED QUAY</span><br>' +
      '<span class="popup-small">Crew assembled · 6 ready</span>',
    );
  }

  // Stage one shot, render a single frame, measure it, and mark the page
  // ready. No animation loop in shot mode: one frame is the screenshot.
  function runShot(game, shot) {
    if (shot === 'title') stageTitle(game);
    else if (shot === 'map') stageMap(game);
    else if (shot === 'marina') stageMarina(game);
    else if (shot === 'hero-zoom') stageHeroZoom(game);
    else stageChase(game);
    game.scene.updateMatrixWorld(true);
    game.renderer.render(game.scene, game.camera);
    computeShotInfo(game, shot);
    window.__ready = true;
  }

  window.AB.shots = {
    runShot: runShot,
    stageChase: stageChase,
    stageTitle: stageTitle,
    stageMap: stageMap,
    stageMarina: stageMarina,
    computeShotInfo: computeShotInfo,
    CRUISER_SPOTS: CRUISER_SPOTS,
  };
})();
