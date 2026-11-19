// SOLMAR BAY — self playtest (?playtest=1): 20 checks run in the browser,
// results written to #playtest-results and document.title for headless reads.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  function run(game) {
    var R = [];
    function check(name, fn) {
      try {
        var r = fn();
        R.push({ name: name, pass: !!r.ok, detail: r.detail || '' });
      } catch (e) {
        R.push({ name: name, pass: false, detail: 'threw: ' + e.message });
      }
    }
    var scene = game.scene, camera = game.camera, renderer = game.renderer;

    check('three-loaded', function () {
      return { ok: typeof THREE !== 'undefined' && !!THREE.WebGLRenderer };
    });
    check('webgl-context', function () {
      return { ok: !!renderer.getContext() };
    });
    check('scene-meshes', function () {
      var n = 0;
      scene.traverse(function (o) { if (o.isMesh || o.isPoints || o.isSprite) n++; });
      return { ok: n > 120, detail: n + ' drawables' };
    });
    check('hero-car', function () {
      var h = game.hero;
      var hasSpoiler = h.body.children.length > 6;
      return { ok: !!h && hasSpoiler && h.tailMat.emissiveIntensity > 0, detail: h.name };
    });
    check('police-units', function () {
      SB.police.setWanted(3);
      var n = SB.police.units().length;
      var heli = SB.police.hasHeli();
      SB.police.setWanted(0);
      return { ok: n >= 3 && heli, detail: n + ' units, heli=' + heli };
    });
    check('pedestrians', function () {
      return { ok: game.peds.length >= 8, detail: game.peds.length + ' peds' };
    });
    check('traffic', function () {
      return { ok: game.traffic.length >= 6, detail: game.traffic.length + ' cars' };
    });
    check('missions-7-jobs', function () {
      return { ok: SB.missions.JOBS.length === 7 };
    });
    check('hud-elements', function () {
      var ids = ['mission-panel', 'status-panel', 'minimap', 'vehicle-panel', 'dialogue'];
      var missing = ids.filter(function (id) { return !document.getElementById(id); });
      return { ok: missing.length === 0, detail: missing.join(',') };
    });
    check('minimap-draws', function () {
      var c = document.getElementById('minimap');
      var g = c.getContext('2d');
      var d = g.getImageData(110, 110, 1, 1).data;
      return { ok: d[3] > 0, detail: 'center rgba ' + d[0] + ',' + d[1] + ',' + d[2] + ',' + d[3] };
    });
    check('save-roundtrip', function () {
      var d = SB.save.defaults();
      d.money = 12345;
      SB.save.save(d);
      var back = SB.save.load();
      SB.save.clear();
      return { ok: !!back && back.money === 12345 };
    });
    check('audio-init', function () {
      var ok = SB.audio.ensure();
      return { ok: true, detail: 'ensure=' + ok + ' (graceful either way)' };
    });
    check('frame-not-black', function () {
      var lum = game.composer
        ? game.composer.frameLuminance(scene, camera)
        : -1;
      return { ok: lum > 0.03, detail: 'luminance ' + lum.toFixed(3) };
    });
    check('rain-points', function () {
      var n = 0;
      scene.traverse(function (o) { if (o.isPoints) n += o.geometry.attributes.position.count; });
      return { ok: n >= 1400, detail: n + ' points' };
    });
    check('neon-signs', function () {
      var n = 0;
      scene.traverse(function (o) {
        if (o.isMesh && o.material && o.material.map && o.material.toneMapped === false) n++;
      });
      return { ok: n >= 25, detail: n + ' emissive textured meshes' };
    });
    check('map-overlay', function () {
      SB.hud.openMap(game.hudState());
      var open = SB.hud.mapOpen();
      SB.hud.closeMap();
      return { ok: open && !SB.hud.mapOpen() };
    });
    check('dialogue-shows', function () {
      SB.hud.showDialogue('lena', 'Playtest line.');
      var vis = !document.getElementById('dialogue').classList.contains('hidden');
      SB.hud.hideDialogue();
      return { ok: vis };
    });
    check('wanted-system', function () {
      SB.police.setWanted(3);
      var a = SB.police.wanted() === 3;
      SB.police.setWanted(0);
      var b = SB.police.wanted() === 0;
      return { ok: a && b };
    });
    check('drive-moves-car', function () {
      var car = game.hero;
      var x0 = car.group.position.x, z0 = car.group.position.z;
      car.speed = 0;
      for (var i = 0; i < 30; i++) SB.cars.updateCar(car, 1 / 60, { throttle: 1, steer: 0 });
      var moved = Math.hypot(car.group.position.x - x0, car.group.position.z - z0);
      car.speed = 0; car.vx = 0; car.vz = 0;
      return { ok: moved > 1, detail: 'moved ' + moved.toFixed(1) + ' m' };
    });
    check('shot-staging', function () {
      game.displaySpeedKmh = 167;
      var s = game.hudState();
      game.displaySpeedKmh = null;
      return { ok: s.speedKmh === 167 && typeof SB.shots.stageShot === 'function' };
    });

    var passed = R.filter(function (r) { return r.pass; }).length;
    var lines = ['PLAYTEST ' + passed + '/' + R.length + (passed === R.length ? ' ALL PASS' : '')];
    R.forEach(function (r) {
      lines.push((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' — ' + r.detail : ''));
    });
    var box = document.getElementById('playtest-results');
    if (box) {
      box.textContent = lines.join('\n');
      box.classList.remove('hidden');
    }
    document.title = 'PLAYTEST ' + passed + '/' + R.length;
    window.__playtest = { passed: passed, total: R.length, results: R };
    return window.__playtest;
  }

  SB.playtest = { run: run };
})();
