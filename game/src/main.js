// CORAL VISTA — boot, game loop, modes (title / drive / on-foot / map),
// near-miss + drift cues, save hooks, and the debug/playtest hooks.
var CV = window.CV || (window.CV = {});

(function () {
  // Console-error tracking for the playtest.
  window.__errors = [];
  window.addEventListener('error', function (e) { window.__errors.push(e.message || 'error'); });
  var origErr = console.error.bind(console);
  console.error = function () {
    window.__errors.push(Array.prototype.slice.call(arguments).join(' '));
    origErr.apply(console, arguments);
  };

  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot') || 'chase';
  var seed = parseInt(params.get('seed') || '1', 10);

  var scene = new THREE.Scene();
  var holder = document.getElementById('game-holder');
  var view = CV.render.init(scene, holder);

  var worldInfo = CV.world.build(scene, seed);
  var hero = new CV.cars.CarState(CV.config.AVENUE_X, -60, 0);
  var heroGroup = CV.cars.buildHeroCar();
  heroGroup.position.set(hero.x, 0, hero.z);
  scene.add(heroGroup);

  CV.police.spawn(scene, { x: hero.x, z: hero.z });
  CV.traffic.spawn(scene, seed);
  var peopleInfo = CV.people.spawn(scene, seed);
  var javi = CV.people.heroOnFoot(scene, 81, 172);
  javi.visible = false;
  CV.world.setCheckpoint(0);

  CV.input.init();
  CV.hud.init();

  var game = {
    scene: scene, hero: hero, heroGroup: heroGroup, javi: javi,
    worldInfo: worldInfo, peopleInfo: peopleInfo, shot: shot,
    mode: 'drive', frame: 0, foot: { x: 81, z: 172, heading: Math.PI, speed: 0 },
  };

  window.SB = { game: game };
  window.__dbg = function () {
    var cam = view.camera.position;
    return {
      shot: shot, mode: game.mode, frame: game.frame,
      hero: { x: +hero.x.toFixed(1), z: +hero.z.toFixed(1), heading: +hero.heading.toFixed(2), kmh: hero.kmh() },
      camera: { x: +cam.x.toFixed(1), y: +cam.y.toFixed(1), z: +cam.z.toFixed(1) },
      heliVisible: CV.police.heliVisibleFrom(view.camera),
      checkpoint: CV.missions.state.checkpoint,
      errors: window.__errors.length,
    };
  };

  // Title screen: START button (also Enter) drops into the drive.
  var startBtn = document.getElementById('start-btn');
  function startGame() {
    CV.audio.ensure();
    CV.audio.sting();
    CV.hud.hideTitle();
    game.mode = 'drive';
  }
  if (startBtn) startBtn.addEventListener('click', startGame);

  // Map-screen save buttons (event delegation).
  var savesEl = document.getElementById('map-saves');
  if (savesEl) savesEl.addEventListener('click', function (e) {
    var slot = e.target.getAttribute && e.target.getAttribute('data-slot');
    if (slot) {
      CV.save.saveSlot(parseInt(slot, 10), {
        cash: CV.missions.state.cash, jobsDone: CV.missions.state.jobsDone,
        bestDrift: CV.missions.state.bestDrift, rep: CV.missions.state.rep,
        jobIndex: CV.missions.state.jobIndex, x: hero.x, z: hero.z,
      });
      CV.audio.sting();
    }
  });

  // Stage the requested shot, then run the playtest (it re-stages after).
  CV.shots.stage(shot, game);
  if (shot === 'title') game.mode = 'title';
  else if (shot === 'marina') game.mode = 'marina';
  else if (shot === 'map') game.mode = 'map';
  else game.mode = 'drive';
  setTimeout(function () { CV.playtest.run(game); }, 1200);

  var clock = new THREE.Clock();
  var nearMissCooldown = 0;
  var driftCueCooldown = 0;
  var lastTime = performance.now();

  function loop() {
    requestAnimationFrame(loop);
    // dt clamp [0.001, 0.05]: a negative first-frame dt once threw the
    // chase camera hundreds of metres (V16 bug) — never again.
    var now = performance.now();
    var dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    var t = now / 1000;
    game.frame++;

    // Actions.
    var action = CV.input.consumeAction();
    if (action === 'start' && game.mode === 'title') startGame();
    if (action === 'map') {
      if (CV.hud.mapVisible()) { CV.hud.hideMap(); game.mode = 'drive'; }
      else if (game.mode === 'drive' || game.mode === 'onfoot') {
        CV.hud.showMap(hero, CV.missions.state.checkpoint);
        game.mode = 'map';
      }
    }
    if (action === 'radio') { CV.audio.ensure(); CV.audio.sting(); }
    if (action === 'mute') CV.audio.toggleMute();
    if (action === 'action' && game.mode === 'drive') {
      // Exit the car: on foot next to it.
      game.mode = 'onfoot';
      game.foot.x = hero.x + 3; game.foot.z = hero.z;
      game.foot.heading = hero.heading;
      javi.position.set(game.foot.x, 0, game.foot.z);
      javi.visible = true;
    } else if (action === 'action' && game.mode === 'onfoot') {
      var dx = hero.x - game.foot.x, dz = hero.z - game.foot.z;
      if (dx * dx + dz * dz < 36) {
        game.mode = 'drive';
        javi.visible = false;
      }
    }
    if (action === 'escape' && CV.hud.mapVisible()) { CV.hud.hideMap(); game.mode = 'drive'; }
    CV.input.clearPressed();

    if (game.mode === 'drive') {
      var res = hero.update(dt, CV.input.state, CV.config.CAR.topSpeed / 3.6);
      var p = CV.world.collide(hero.x, hero.z, 1.5);
      hero.x = p.x; hero.z = p.z;
      heroGroup.position.set(hero.x, 0, hero.z);
      heroGroup.rotation.y = hero.heading;
      heroGroup.rotation.z = -hero.steer * hero.drift * 0.22;
      heroGroup.userData.wheels.forEach(function (w) { w.rotation.x += hero.speed * dt * 2.6; });
      // Drift cue.
      if (res.drifting && driftCueCooldown <= 0) {
        CV.hud.showCue('DRIFT x3', 'NEAR MISS +$250');
        driftCueCooldown = 5;
      }
      // Near miss: traffic car passing close at speed.
      if (nearMissCooldown <= 0 && Math.abs(hero.speed) > 18) {
        for (var i = 0; i < CV.traffic.cars.length; i++) {
          var tc = CV.traffic.cars[i];
          var tdx = tc.x - hero.x, tdz = tc.z - hero.z;
          var ahead = Math.sin(hero.heading) * tdx + Math.cos(hero.heading) * tdz;
          var side = Math.abs(Math.cos(hero.heading) * tdx - Math.sin(hero.heading) * tdz);
          if (ahead > -2 && ahead < 6 && side > 1.8 && side < 4) {
            CV.missions.nearMissBonus();
            CV.hud.showCue('NEAR MISS', '+$250');
            nearMissCooldown = 6;
            break;
          }
        }
      }
      var missionEvent = CV.missions.update(dt, hero, res.drifting);
      if (missionEvent && missionEvent.checkpoint) CV.audio.sting();
    } else if (game.mode === 'onfoot') {
      // Walk Javi with WASD.
      var mv = { x: 0, z: 0 };
      var sp = CV.input.state.run ? 7 : 3.6;
      if (CV.input.state.forward) { mv.x += Math.sin(game.foot.heading); mv.z += Math.cos(game.foot.heading); }
      if (CV.input.state.back) { mv.x -= Math.sin(game.foot.heading); mv.z -= Math.cos(game.foot.heading); }
      if (CV.input.state.left) game.foot.heading += dt * 2.4;
      if (CV.input.state.right) game.foot.heading -= dt * 2.4;
      game.foot.x += mv.x * sp * dt;
      game.foot.z += mv.z * sp * dt;
      var fp = CV.world.collide(game.foot.x, game.foot.z, 0.5);
      game.foot.x = fp.x; game.foot.z = fp.z;
      javi.position.set(game.foot.x, 0, game.foot.z);
      javi.rotation.y = game.foot.heading;
    }

    if (nearMissCooldown > 0) nearMissCooldown -= dt;
    if (driftCueCooldown > 0) driftCueCooldown -= dt;

    CV.police.update(dt, t, hero);
    CV.traffic.update(dt, hero);
    CV.people.update(dt, t, hero);
    CV.world.update(dt, t);
    CV.audio.update(hero.kmh(), true, t);

    var camMode = game.mode === 'map' ? 'drive' : game.mode;
    var camTarget = game.mode === 'onfoot' || game.mode === 'marina' ? game.foot : hero;
    CV.render.update(scene, camTarget, camMode, dt, t, false);
    CV.hud.update(dt, game);
    CV.render.render(scene);
  }
  loop();
})();
