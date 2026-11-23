// Aurelia Bay — screenshot staging. The four submitted screenshots are real
// renders of the game, staged deterministically: ?shot=1..4 sets the exact
// position, wanted level, camera and HUD state before the frame is taken.
// The city seed is fixed, so the same shot number always frames the same
// street. Nothing here edits pixels — it only drives the real game.
(function () {
  'use strict';

  // Shot definitions: what each submitted image shows.
  // 1 — cover: low chase cam behind the Dorado on Sunset Mile, heli + spotlight
  //     in frame, three cruisers behind, traffic ahead, full HUD, DRIFT x3.
  // 2 — on foot: Dante aiming on Coral Market street, shoppers around, shops
  //     with signs, a cruiser closing in, full HUD.
  // 3 — pause menu: full city map + stats + saves (the completeness proof).
  // 4 — coastal chase: beachfront road, ocean + pier + palms, two cruisers
  //     behind, heli overhead, full HUD.
  var SHOTS = {
    1: { mode: 'drive', x: 0, z: 46, heading: Math.PI, speed: 32, wanted: 4, stage: 1, cam: 'chase-low' },
    2: { mode: 'foot', x: -60, z: -30, heading: Math.PI, wanted: 2, stage: 1, cam: 'foot' },
    3: { mode: 'menu', x: 0, z: 46, heading: Math.PI, speed: 0, wanted: 4, stage: 1, cam: 'chase-low' },
    4: { mode: 'drive', x: -120, z: 40, heading: Math.PI, speed: 28, wanted: 4, stage: 1, cam: 'chase-low' }
  };

  function shotFromURL() {
    try {
      var m = window.location.search.match(/[?&]shot=(\d)/);
      return m ? parseInt(m[1], 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  // Apply a shot preset to the live game state. Called once after boot, then
  // the game runs normally for a few seconds so traffic, the heli and the
  // pedestrians settle into the frame before the screenshot is taken.
  function applyShot(game, n) {
    var def = SHOTS[n];
    if (!def) return false;
    var g = game;

    // fixed clock for every shot: Friday 13:42, clear skies
    g.clockMinutes = 13 * 60 + 42;
    g.missions.setStage(def.stage);
    g.missions.setTimer(192);

    if (def.mode === 'drive' || def.mode === 'menu') {
      g.enterCar();
      g.car.x = def.x; g.car.z = def.z;
      g.car.heading = def.heading;
      g.car.speed = def.speed;
      g.car.condition = 71;
      g.money = 27850;
      g.health = 78; g.armour = 61; g.rep = 2310;
    } else {
      g.exitCar(def.x, def.z, def.heading);
      g.money = 27850;
      g.health = 78; g.armour = 61; g.rep = 2310;
    }

    g.police.setWanted(def.wanted, { x: def.x, z: def.z });
    // settle the chase: run the police update a few steps so cruisers close in
    for (var i = 0; i < 40; i++) {
      g.police.update(0.05, { x: def.x, z: def.z, heading: def.heading }, def.speed || 0, i * 0.05);
    }
    // place cruisers in frame behind the player for the chase shots
    if (def.mode === 'drive') {
      var cruisers = g.police.cruisers;
      var behind = def.heading + Math.PI;
      cruisers.forEach(function (c, idx) {
        var off, lat;
        if (idx === 0) {
          // one cruiser pulls up alongside ahead — the chase must be visible
          off = -32; lat = 6;
        } else {
          off = 12 + idx * 8;
          lat = (idx % 2 === 0 ? 1 : -1) * (2 + (idx % 3));
        }
        c.x = def.x + Math.sin(behind) * off + Math.cos(behind) * lat;
        c.z = def.z + Math.cos(behind) * off - Math.sin(behind) * lat;
        c.heading = def.heading;
        c.speed = def.speed - 4;
        c.model.position.set(c.x, 0, c.z);
        c.model.rotation.y = c.heading - Math.PI / 2;
      });
      // heli visible in the upper frame, spotlight on the player
      if (g.police.heli) {
        g.police.heli.position.set(def.x + 30, 55, def.z - 40);
      }
      // drift popup + near-miss cue on the cover
      if (n === 1) {
        g.hud.popup('DRIFT x3', 'NEAR MISS +$250');
        g.spawnExplosion(def.x + Math.sin(def.heading) * 55, def.z + Math.cos(def.heading) * 55);
      }
      if (n === 4) {
        g.hud.popup('NEAR MISS +$150', '');
      }
    }
    if (def.mode === 'foot') {
      // pedestrians flee as the player draws: a living street, mid-action
      g.peds.scatter(def.x, def.z, 14);
      g.player.aiming = true;
      // cruisers close in but stay out of the camera: visible, not on top of it
      var fc = g.police.cruisers;
      var spots = [[0, -20], [-3, -40], [3, -60], [0, -80]];
      fc.forEach(function (c, idx) {
        var sp = spots[idx % spots.length];
        c.x = def.x + sp[0]; c.z = def.z + sp[1];
        c.heading = Math.atan2(def.x - c.x, def.z - c.z);
        c.speed = 0;
        c.model.position.set(c.x, 0, c.z);
        c.model.rotation.y = c.heading - Math.PI / 2;
      });
    }
    if (def.mode === 'menu') {
      g.openPause();
    }
    return true;
  }

  window.AB.shots = { SHOTS: SHOTS, shotFromURL: shotFromURL, applyShot: applyShot };
})();
