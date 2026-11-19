// SOLMAR BAY — screenshot staging: deterministic frozen frames for the four
// dossier screenshots. Each shot sets up a scene, lets it settle, then the
// game freezes updates (camera snaps instantly, HUD stays live) for capture.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  function params() {
    var q = new URLSearchParams(window.location.search);
    return {
      shot: q.get('shot') || '',
      seed: parseInt(q.get('seed') || '9', 10),
      playtest: q.get('playtest') === '1',
      perfLow: q.get('perf') === 'low'
    };
  }

  var P = params();

  function stageShot(game) {
    var g = game;
    g.hideTitle();
    g.shotMode = P.shot;
    switch (P.shot) {
      case '1-chase': stageChase(g); break;
      case '2-title': stageTitle(g); break;
      case '3-map': stageMap(g); break;
      case '4-marina': stageMarina(g); break;
    }
    // Let the scene settle, then freeze: main.js stops updates after 40 frames.
    g.freezeAtFrame = g.frame + 40;
  }

  function clearTrafficNear(game, x, z, r) {
    game.traffic.forEach(function (c) {
      var dx = c.group.position.x - x, dz = c.group.position.z - z;
      if (dx * dx + dz * dz < r * r) {
        // Move it far down a side road so nothing crowds the hero.
        SB.cars.placeCar(c, -40, -100 + Math.random() * 20, 0);
        c.route = SB.cars.makeTrafficRoute(new SB.utils.RNG(5));
        c.routeIdx = 0;
      }
    });
  }

  function stageChase(g) {
    SB.missions.setJobStage(0, 1); // CH 1, STAGE 2/4: drive to the garage
    SB.police.setWanted(3);
    // Hero on Solmar Avenue heading north (+Z), camera snaps behind.
    SB.cars.placeCar(g.hero, 0.6, 14, 0);
    g.enterCar(g.hero, true);
    // TWO police cars ahead, placed through car state (never at the origin).
    // Close (12-18 m) and offset left/right so the light bars read clearly.
    var units = SB.police.units();
    if (units[0]) SB.cars.placeCar(units[0], 4.6, 27, 0.08);
    if (units[1]) SB.cars.placeCar(units[1], -4.2, 32, -0.06);
    if (units[2]) SB.cars.placeCar(units[2], 1.0, 48, 0);
    // Heli ahead-left so the searchlight beam is a diagonal, not a blob
    // across the centre of the frame.
    SB.police.setHeliAngle(2.2);
    clearTrafficNear(g, 0.6, 14, 26);
    // A couple of distant cars for life, far ahead.
    if (g.traffic[0]) SB.cars.placeCar(g.traffic[0], -4.5, 88, 0);
    if (g.traffic[1]) SB.cars.placeCar(g.traffic[1], 5.0, 96, 0);
    g.displaySpeedKmh = 167; // hero still, speedometer reads 167
    SB.hud.showAction('NEAR MISS +$250');
    SB.hud.showDialogue('lena', 'Two units on your tail, Rico — lose them on Palm Row!');
    g.state.money = 42780;
    g.state.respect = 320;
    g.state.respectLevel = 2;
  }

  function stageTitle(g) {
    // Title screen stays up; the 3D scene behind is the backdrop.
    // Hero close and right-of-centre, camera over the road (no building
    // face at the frame edge), neon street + skyline behind.
    g.showTitle();
    SB.cars.placeCar(g.hero, 0, 30, 0.35);
    SB.police.setWanted(0);
    clearTrafficNear(g, 0, 30, 30);
    g.titleCam = {
      pos: new THREE.Vector3(-5.5, 2.0, 19),
      look: new THREE.Vector3(1, 1.3, 33)
    };
  }

  function stageMap(g) {
    SB.missions.setJobStage(0, 0); // stage 1: GPS route draws to the garage
    SB.police.setWanted(2);
    // Rico on foot at the marina; the route runs across the whole city.
    g.exitCar(true);
    g.rico.group.position.set(104, 0, 55);
    g.rico.heading = Math.PI / 2;
    SB.hud.openMap(g.hudState());
    g.state.money = 42780;
  }

  function stageMarina(g) {
    SB.missions.setJobStage(0, 0); // enter-car stage: dialogue stays, no auto-complete
    SB.police.setWanted(0);
    g.exitCar(true);
    // Rico on the clear quay facing the docks (+X). Staged at z=40: the
    // marina lamp poles sit at z=26/55/84, so no pole is on the camera axis.
    g.rico.group.position.set(106, 0.55, 40);
    g.rico.heading = Math.PI / 2;
    // Crew nearby with umbrellas; hero parked ahead-right, nose toward the
    // camera so its headlights read.
    g.placeCrew([
      { who: 'lena', x: 103, z: 36, heading: 2.4 },
      { who: 'dario', x: 109, z: 33, heading: -2.2 }
    ]);
    SB.cars.placeCar(g.hero, 110, 47, -2.3);
    SB.hud.showDialogue('rosa', 'Tonight the city learns our name, Rico. Drive it home.');
    g.state.money = 43980;
    g.footCamShot = true; // foot camera back 7.5, height 3.6 in shot mode
  }

  SB.shots = { params: P, stageShot: stageShot, isShot: !!P.shot };
})();
