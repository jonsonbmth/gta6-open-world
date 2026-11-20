// In-page playtest: 20 checks run shortly after boot. Results land in
// window.__playtest and the #playtest-results box for the headless runner.
// The hero state is snapshotted and restored, then the shot is re-staged,
// so the playtest never disturbs the screenshot.
var CV = window.CV || (window.CV = {});

CV.playtest = (function () {
  var results = [];
  var done = false;

  function check(name, pass, detail) {
    results.push({ name: name, pass: !!pass, detail: detail || '' });
  }

  function canvasNonBlank(canvas) {
    try {
      var g = canvas.getContext('2d');
      var d = g.getImageData(0, 0, canvas.width, canvas.height).data;
      var seen = {};
      for (var i = 0; i < d.length; i += 997) {
        var k = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
        seen[k] = true;
        if (Object.keys(seen).length > 6) return true;
      }
      return false;
    } catch (e) { return false; }
  }

  function run(game) {
    if (done) return;
    done = true;
    var hero = game.hero;
    var snap = { x: hero.x, z: hero.z, heading: hero.heading, speed: hero.speed, cp: CV.missions.state.checkpoint, cash: CV.missions.state.cash };

    // 1-5: structure.
    check('three.js loaded', typeof THREE !== 'undefined' && !!THREE.WebGLRenderer);
    check('city has 50+ buildings', game.worldInfo.buildings >= 50, game.worldInfo.buildings + ' buildings');
    check('hero car in scene', !!game.heroGroup && game.heroGroup.parent === game.scene);
    check('4 police cruisers', CV.police.units.length === 4, CV.police.units.length + ' units');
    check('helicopter + spotlight cone', !!game.scene.getObjectByName('heli'));

    // 6-8: driving physics on a scratch CarState (never touches the hero).
    var t1 = new CV.cars.CarState(90, -60, 0);
    for (var i = 0; i < 90; i++) t1.update(1 / 60, { forward: true }, 45);
    check('drive forward', t1.speed > 5, t1.speed.toFixed(1) + ' m/s');
    var t2 = new CV.cars.CarState(90, -60, 0);
    t2.speed = 20;
    var h0 = t2.heading;
    for (var j = 0; j < 60; j++) t2.update(1 / 60, { left: true }, 45);
    check('steering changes heading', Math.abs(t2.heading - h0) > 0.3, (t2.heading - h0).toFixed(2) + ' rad');
    var t3 = new CV.cars.CarState(90, -60, 0);
    t3.speed = 25;
    for (var k = 0; k < 90; k++) t3.update(1 / 60, { forward: true, left: true, handbrake: true }, 45);
    check('drift scores points', t3.driftScore > 0, Math.round(t3.driftScore) + ' pts');

    // 9: checkpoint advances the mission (hero teleported, then restored).
    var cpBefore = CV.missions.state.checkpoint;
    var cp = CV.missions.checkpoint();
    hero.x = cp.x; hero.z = cp.z;
    CV.missions.update(0.1, hero, false);
    check('checkpoint advances mission', CV.missions.state.checkpoint !== cpBefore || CV.missions.state.cash > snap.cash);
    hero.x = snap.x; hero.z = snap.z; hero.heading = snap.heading; hero.speed = snap.speed;
    CV.missions.state.checkpoint = snap.cp;
    CV.missions.state.cash = snap.cash;
    CV.world.setCheckpoint(snap.cp);

    // 10-14: HUD + screens render.
    check('minimap renders', canvasNonBlank(document.getElementById('minimap')));
    check('dispatch board has 6 rows', document.querySelectorAll('#hud-dispatch .d-row').length === 6);
    check('weapon slots = 6', document.querySelectorAll('#hud-weapons .w-slot').length === 6);
    var dlg = document.getElementById('dlg-port');
    check('dialog portrait drawn', !!dlg && canvasNonBlank(dlg));
    CV.hud.showMap(hero, CV.missions.state.checkpoint);
    check('map screen renders', canvasNonBlank(document.getElementById('map-canvas')));
    CV.hud.hideMap();

    // 15: save/load roundtrip (restores the player's real slot 1 after —
    // the test must not pollute a save slot).
    var before = CV.save.loadSlot(1);
    var okSave = CV.save.saveSlot(1, { cash: 12345, jobsDone: 3, bestDrift: 42, rep: 1800, jobIndex: 3, x: 90, z: -60 });
    var loaded = CV.save.loadSlot(1);
    check('save/load roundtrip', okSave && loaded && loaded.cash === 12345);
    if (before) CV.save.saveSlot(1, before); else CV.save.clearSlot(1);

    // 16-19: screens, crew, people, traffic.
    check('title screen present', !!document.getElementById('title-screen'));
    check('marina crew = 3', CV.people.crew.length === 3, CV.people.crew.length + ' crew');
    check('pedestrians 30+', CV.people.peds.length >= 30, CV.people.peds.length + ' peds');
    var tc = CV.traffic.cars[0];
    var tz0 = tc ? tc.z : 0;
    CV.traffic.update(1.0, { x: 0, z: -500 });
    check('traffic cars move', !!tc && Math.abs(tc.z - tz0) > 1, tc ? ('moved ' + Math.abs(tc.z - tz0).toFixed(1) + ' m') : 'no traffic');

    // 20: frames advancing + zero console errors (async: sample the frame counter).
    var f0 = game.frame;
    var err0 = (window.__errors || []).length;
    setTimeout(function () {
      check('frames advancing, zero console errors', game.frame > f0 && (window.__errors || []).length === err0,
        (game.frame - f0) + ' frames in 600ms, ' + (window.__errors || []).length + ' errors');
      finish(game);
    }, 600);
  }

  function finish(game) {
    var passed = results.filter(function (r) { return r.pass; }).length;
    window.__playtest = { passed: passed, total: results.length, results: results };
    var box = document.getElementById('playtest-results');
    if (box) {
      box.textContent = 'PLAYTEST ' + passed + '/' + results.length + ' — ' +
        results.map(function (r) { return (r.pass ? 'PASS ' : 'FAIL ') + r.name; }).join(' | ');
    }
    // Re-stage the shot so the screenshot is pristine.
    try { CV.shots.stage(game.shot, game); } catch (e) { /* ignore */ }
  }

  return { run: run };
})();
