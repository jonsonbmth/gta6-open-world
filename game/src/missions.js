// SOLMAR BAY — story missions: 7 jobs, staged objectives, dialogue with
// portraits, cash + respect rewards. Progress is latched: a 'lose the heat'
// stage only completes after the player HAS been wanted, never instantly at
// zero stars.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;

  var M = {
    list: C.missions,
    current: 0, // index into list; -1 when all done
    stage: 0,
    stageState: {}, // per-stage latch data
    completed: [],
    active: false,
    timer: 0,
    beacon: null,
    beaconRing: null,
  };

  var sceneRef = null;

  M.init = function (scene) {
    sceneRef = scene;
    // Objective beacon: a tall glowing column + ring on the ground.
    var col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: C.neonYellow, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    col.visible = false;
    scene.add(col);
    M.beacon = col;
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.1, 24),
      new THREE.MeshBasicMaterial({
        color: C.neonYellow, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.visible = false;
    scene.add(ring);
    M.beaconRing = ring;
  };

  M.mission = function () {
    if (M.current < 0 || M.current >= M.list.length) return null;
    return M.list[M.current];
  };

  M.stageDef = function () {
    var m = M.mission();
    if (!m) return null;
    return m.stages[M.stage] || null;
  };

  M.start = function (index) {
    M.current = index;
    M.stage = 0;
    M.stageState = {};
    M.active = true;
    var m = M.mission();
    if (!m) { M.active = false; return; }
    if (m.stages[0] && m.stages[0].timer) M.timer = m.stages[0].timer;
    M.showBeacon();
    if (m.dialogue) {
      m.dialogue.forEach(function (d, i) {
        SB.events && SB.events.emit('dialogue', d.who, d.text, i * 4500);
      });
    }
    SB.events && SB.events.emit('mission_start', m);
  };

  M.showBeacon = function () {
    var s = M.stageDef();
    if (!s || s.type !== 'reach' || !M.beacon) {
      if (M.beacon) M.beacon.visible = false;
      if (M.beaconRing) M.beaconRing.visible = false;
      return;
    }
    M.beacon.position.set(s.x, 30, s.z);
    M.beacon.visible = true;
    M.beaconRing.position.set(s.x, 0.08, s.z);
    M.beaconRing.visible = true;
  };

  M.advance = function () {
    var m = M.mission();
    M.stage++;
    M.stageState = {};
    if (!m || M.stage >= m.stages.length) {
      M.complete();
      return;
    }
    var s = M.stageDef();
    if (s && s.timer) M.timer = s.timer;
    M.showBeacon();
    SB.events && SB.events.emit('stage', m, M.stage);
  };

  M.complete = function () {
    var m = M.mission();
    if (!m) return;
    M.completed.push(m.id);
    M.active = false;
    if (M.beacon) M.beacon.visible = false;
    if (M.beaconRing) M.beaconRing.visible = false;
    SB.events && SB.events.emit('mission_complete', m);
    // Next job starts when the player reaches the next beacon (auto after a beat).
    if (M.current + 1 < M.list.length) {
      M.current++;
      M.stage = 0;
      M.stageState = {};
      setTimeout(function () { M.start(M.current); }, 2500);
    } else {
      M.current = -1;
      SB.events && SB.events.emit('story_done');
    }
  };

  // Called every frame with the player's state.
  M.update = function (dt, ctx) {
    if (!M.active) return;
    var m = M.mission();
    var s = M.stageDef();
    if (!m || !s) return;
    // Timer stages.
    if (s.timer) {
      M.timer -= dt;
      if (M.timer <= 0) {
        SB.events && SB.events.emit('mission_failed', m, 'Out of time');
        M.active = false;
        M.stage = 0;
        M.stageState = {};
        setTimeout(function () { M.start(M.current); }, 2000);
        return;
      }
    }
    switch (s.type) {
      case 'enter_car':
        if (ctx.inCar) M.advance();
        break;
      case 'reach': {
        var d2 = U.dist2(ctx.x, ctx.z, s.x, s.z);
        if (d2 < s.r * s.r) M.advance();
        break;
      }
      case 'wanted_at_least':
        if (SB.police.wanted >= s.stars) M.advance();
        break;
      case 'lose_heat':
        // Latch: the player must HAVE been wanted before 0 stars counts.
        if (SB.police.wanted > 0) M.stageState.wasWanted = true;
        if (M.stageState.wasWanted && SB.police.wanted === 0) M.advance();
        break;
      default:
        break;
    }
    // Beacon pulse.
    if (M.beaconRing && M.beaconRing.visible) {
      var pulse = 1 + Math.sin(performance.now() * 0.005) * 0.12;
      M.beaconRing.scale.set(pulse, pulse, 1);
    }
  };

  M.objectiveText = function () {
    var m = M.mission();
    var s = M.stageDef();
    if (!m) return 'SOLMAR BAY IS YOURS';
    if (!s) return m.title;
    return s.text;
  };

  M.stageLabel = function () {
    var m = M.mission();
    if (!m) return '';
    return 'STAGE ' + (M.stage + 1) + '/' + m.stages.length;
  };

  SB.missions = M;
})();
