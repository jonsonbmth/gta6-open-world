// SOLMAR BAY — missions: the Sunset Sprint. Six checkpoints in order, glowing
// rings to drive through, a timer, cash per checkpoint, and the GPS route the
// map and minimap draw.

var SB = window.SB || (window.SB = {});

SB.missions = (function () {
  const cfg = SB.config;
  let scene = null;
  let rings = [];
  let state = null;

  function reset() {
    const wonBefore = state ? state.won : 0;
    state = {
      active: true,
      index: 0,
      timeLeft: cfg.mission.timeLimit,
      cash: 0,
      won: wonBefore,
      finished: false,
    };
    // Bring every ring, beam and number label back (a TIME UP reset re-arms them).
    for (const r of rings) {
      r.hit = false;
      r.ring.visible = true;
      r.beam.visible = true;
      r.label.visible = true;
    }
    return state;
  }

  function build(sc) {
    scene = sc;
    rings = [];
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8c2a, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffa040, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < cfg.mission.checkpoints.length; i++) {
      const cp = cfg.mission.checkpoints[i];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.32, 10, 32), ringMat.clone());
      ring.position.set(cp.x, 2.6, cp.z);
      ring.rotation.y = Math.PI / 2;
      scene.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 40, 24, 1, true), beamMat.clone());
      beam.position.set(cp.x, 20, cp.z);
      scene.add(beam);
      // Number sprite above the ring.
      const num = makeLabel(String(i + 1));
      num.position.set(cp.x, 8.5, cp.z);
      scene.add(num);
      rings.push({ ring: ring, beam: beam, label: num, cp: cp, hit: false });
    }
  }

  function makeLabel(text) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    g.beginPath();
    g.arc(64, 64, 52, 0, Math.PI * 2);
    g.fillStyle = '#ff8c2a';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = 'bold 64px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 64, 68);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(7, 7, 1);
    return sp;
  }

  // True when the car is inside the current checkpoint ring.
  function checkPassed(carPos) {
    if (!state || !state.active || state.finished) return -1;
    const cp = cfg.mission.checkpoints[state.index];
    const dx = carPos.x - cp.x;
    const dz = carPos.z - cp.z;
    if (dx * dx + dz * dz < 6.5 * 6.5) {
      const hit = state.index;
      rings[hit].hit = true;
      rings[hit].ring.visible = false;
      rings[hit].beam.visible = false;
      rings[hit].label.visible = false;
      state.cash += 250;
      state.index++;
      if (state.index >= cfg.mission.checkpoints.length) {
        state.finished = true;
        state.active = false;
        state.won++;
      }
      return hit;
    }
    return -1;
  }

  function currentCheckpoint() {
    if (!state) return null;
    return cfg.mission.checkpoints[Math.min(state.index, cfg.mission.checkpoints.length - 1)];
  }

  // GPS path: car -> remaining checkpoints, as world points.
  function gpsPath(carPos) {
    const pts = [{ x: carPos.x, z: carPos.z }];
    for (let i = state.index; i < cfg.mission.checkpoints.length; i++) {
      pts.push({ x: cfg.mission.checkpoints[i].x, z: cfg.mission.checkpoints[i].z });
    }
    return pts;
  }

  // Pulse the current ring so it reads from a distance.
  function update(time) {
    if (!rings.length) return;
    const cur = state && !state.finished ? rings[state.index] : null;
    if (cur) {
      const s = 1 + Math.sin(time * 4) * 0.08;
      cur.ring.scale.set(s, s, s);
      cur.ring.rotation.x = Math.sin(time * 1.5) * 0.15;
    }
  }

  // Show or hide the rings / beams / number labels (the title and marina
  // shots hide them so no glowing pillar photobombs the frame).
  function setVisible(v) {
    for (const r of rings) {
      r.ring.visible = v && !r.hit;
      r.beam.visible = v && !r.hit;
      r.label.visible = v && !r.hit;
    }
  }

  return {
    build: build,
    reset: reset,
    setVisible: setVisible,
    state: function () { return state; },
    checkPassed: checkPassed,
    currentCheckpoint: currentCheckpoint,
    gpsPath: gpsPath,
    update: update,
  };
})();
