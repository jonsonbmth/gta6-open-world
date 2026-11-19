// SOLMAR BAY — screenshot mode (?shot=chase|title|map|marina&seed=1).
// Each shot configures a deterministic, dense scene: the cover shows the
// chase with TWO police cars ahead, the hero big in frame, and a full HUD.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var U = SB.utils;

  var Sh = {
    mode: null,
    ready: false,
  };

  function $(id) { return document.getElementById(id); }

  function hideTitle() {
    var t = $('title-screen');
    if (t) t.style.display = 'none';
    var h = $('hud');
    if (h) h.style.display = 'block';
  }

  function showTitle() {
    var t = $('title-screen');
    if (t) t.style.display = 'flex';
    var h = $('hud');
    if (h) h.style.display = 'none';
  }

  // The cover: night chase on Lumen Avenue. Hero big in frame, low close
  // chase cam, TWO police cars ahead with strobing light bars, wanted 3
  // stars, NEAR MISS bonus on screen, Lena talking.
  function shotChase(game) {
    hideTitle();
    game.mode = 'playing';
    game.inCar = true;
    var hero = game.heroState;
    hero.x = 2; hero.z = 20; hero.heading = Math.PI;
    hero.speed = 46; // 167 KM/H on the speedo
    hero.car.group.position.set(2, 0, 20);
    hero.car.group.rotation.y = Math.PI;
    // Two police cars clearly ahead: one right-front close, one center farther.
    SB.police.setWanted(3);
    SB.police.placeShotUnits(game.scene, [
      { x: 5.5, z: 4, heading: Math.PI, speed: 40 },
      { x: -4.5, z: 0, heading: Math.PI, speed: 40 },
    ]);
    // Freeze the chase in place for a deterministic frame (wheels still spin,
    // rain still falls, lights still strobe).
    game.shotFrozen = true;
    game.camClose = true;
    game.cash = 42780;
    game.respect = 320;
    game.missionIndex = 0;
    SB.missions.start(0);
    SB.missions.stage = 1; // already driving to the docks, not "get in the car"
    SB.missions.showBeacon();
    SB.hud.showDialogue('lena', 'Two units ahead, Rico. Thread the needle — do NOT clip them.');
    // The mission's second dialogue line fires at 4.5s; re-show Lena after it
    // so the cover frame carries the chase callout.
    SB.hud.showDialogue('lena', 'Two units ahead, Rico. Thread the needle — do NOT clip them.', 5200);
    setTimeout(function () { SB.hud.floatText('NEAR MISS  +$250', '#ffd23f'); }, 600);
    game.camMode = 'chase';
  }

  // The title screen over the skyline, hero parked in the foreground.
  function shotTitle(game) {
    showTitle();
    game.mode = 'title';
    game.inCar = false;
    var hero = game.heroState;
    hero.x = 3; hero.z = 40; hero.heading = Math.PI * 0.92;
    hero.speed = 0;
    hero.car.group.position.set(3, 0, 40);
    hero.car.group.rotation.y = hero.heading;
    SB.police.setWanted(0);
    game.camMode = 'title';
  }

  // The AAA city map, open, with a GPS route to the mission target.
  function shotMap(game) {
    hideTitle();
    game.inCar = true;
    var hero = game.heroState;
    hero.x = 0; hero.z = 40; hero.heading = Math.PI;
    hero.speed = 0;
    hero.car.group.position.set(0, 0, 40);
    hero.car.group.rotation.y = Math.PI;
    SB.police.setWanted(3);
    game.cash = 42780;
    game.respect = 320;
    SB.missions.start(0);
    SB.missions.stage = 1; // drive-to stage, so the GPS route draws
    SB.citymap.openMap(game.hudState());
    game.mode = 'map'; // freeze the world behind the open map
  }

  // On foot at the marina: Rico with the crew, dialogue open, boats and lamps.
  // Rico stands on the clear quay south of the crate field, facing the
  // docks (heading 0 = south), so the boats, lamps and bay fill the frame.
  function shotMarina(game) {
    hideTitle();
    game.mode = 'playing';
    game.inCar = false;
    game.rico.x = -132;
    game.rico.z = 160;
    game.rico.heading = 0;
    // Place Rico's group explicitly — the frozen frame never runs the foot
    // sync that would move it there.
    if (game.rico.group) {
      game.rico.group.position.set(-132, 0, 160);
      game.rico.group.rotation.y = 0;
      game.rico.group.visible = true;
    }
    // Freeze the frame: snaps the camera behind Rico and stops traffic from
    // crashing into the parked hero car (which would add heat mid-shot).
    game.shotFrozen = true;
    game.camClose = true;
    // Park the hero car nearby, visible in frame.
    var hero = game.heroState;
    hero.x = -127; hero.z = 159; hero.heading = 2.4;
    hero.speed = 0;
    hero.car.group.position.set(-127, 0, 159);
    hero.car.group.rotation.y = 2.4;
    // Place three crew members near Rico (reuse pedestrians, parked in place).
    var crewSpots = [
      { x: -135, z: 164, coat: 0xff2d95 },
      { x: -129, z: 163, coat: 0x00e5ff },
      { x: -134, z: 157, coat: 0x2eff8f },
    ];
    crewSpots.forEach(function (spot, i) {
      var p = SB.people.list[i];
      if (!p) return;
      p.x = spot.x; p.z = spot.z;
      p.heading = 2.6;
      p.speed = 0;
      p.walkTarget = { x: spot.x, z: spot.z };
      p.home = { x: spot.x, z: spot.z };
      p.person.group.position.set(spot.x, 0, spot.z);
      p.person.group.rotation.y = 2.6;
    });
    SB.police.setWanted(0);
    SB.missions.start(0);
    SB.hud.showDialogue('rosa', 'The boat docks at midnight, Rico. We do this clean — no heat.');
    // The mission's second line fires at 4.5s; re-show Rosa after it.
    SB.hud.showDialogue('rosa', 'The boat docks at midnight, Rico. We do this clean — no heat.', 5200);
    game.camMode = 'foot';
  }

  Sh.apply = function (mode, game) {
    Sh.mode = mode;
    if (mode === 'chase') shotChase(game);
    else if (mode === 'title') shotTitle(game);
    else if (mode === 'map') shotMap(game);
    else if (mode === 'marina') shotMarina(game);
    Sh.ready = true;
    if (window.__shotDone) window.__shotDone(mode);
  };

  SB.shots = Sh;
})();
