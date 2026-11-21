// Sirena Bay — the game itself: bootstrap, the fixed-timestep loop, driving
// and walking, the wanted system with pursuing police and a helicopter,
// traffic, pedestrians, the marina crew, missions, the save, and a small
// procedural WebAudio soundtrack. Playable with keyboard and mouse; the
// ?shot= parameter freezes the game in a staged pose for screenshots.

(function () {
  'use strict';

  const U = window.SB.util;
  const STEP = 1 / 60;

  const SAVE_KEY = 'sirena-bay-save-v1';

  const game = {
    state: {
      cash: 31240, stars: 4, health: 100, armor: 65, speed: 0,
      condition: 82, district: 'SUNSET QUAY', street: 'Mermaid Mile',
      stage: 3, stages: 4, respect: 2140, respectMax: 2600, rank: 'WHEELMAN',
    },
    driving: true,
    paused: false,
    mode: 'title',
    shotName: null,
    keys: {},
    camYaw: 0,
    camPitch: 0,
    playerSpeed: 0,
    playerHeading: Math.PI,
    wantedCooldown: 0,
    hiddenTimer: 0,
    time: 0,
  };

  // ------------------------------------------------------------------
  // Audio: everything synthesized, no files. Engine hum, police siren,
  // and a soft radio arpeggio. Starts on the first key or click.
  // ------------------------------------------------------------------
  const AudioSys = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, radioTimer: 0, muted: false,
    init() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'square';
        this.sirenOsc.frequency.value = 720;
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.master);
        this.sirenOsc.start();
      } catch (e) { /* audio is a garnish; the game plays without it */ }
    },
    update(dt) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      if (this.engineOsc) {
        const target = game.driving ? 0.05 + Math.min(0.10, Math.abs(game.playerSpeed) * 0.0016) : 0.0;
        this.engineGain.gain.setTargetAtTime(target, t, 0.1);
        this.engineOsc.frequency.setTargetAtTime(50 + Math.abs(game.playerSpeed) * 2.1, t, 0.1);
      }
      if (this.sirenOsc) {
        const on = game.state.stars >= 1 && game.mode === 'play';
        this.sirenGain.gain.setTargetAtTime(on ? 0.018 : 0, t, 0.2);
        if (on) this.sirenOsc.frequency.setTargetAtTime(Math.sin(this.ctx.currentTime * 4) > 0 ? 950 : 720, t, 0.05);
      }
    },
    blip(freq) {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq || 660;
      g.gain.setValueAtTime(0.12, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + 0.3);
    },
  };

  // ------------------------------------------------------------------
  // Setup
  // ------------------------------------------------------------------
  function init() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-canvas-holder').appendChild(renderer.domElement);
    game.renderer = renderer;

    const scene = new THREE.Scene();
    game.scene = scene;
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);
    camera.position.set(8, 5, 14);
    game.camera = camera;

    const city = window.SB.city.buildCity(scene, 20261121);
    game.city = city;
    game.buildings = city.buildings || [];

    // The hero car — a red MANTA GT.
    game.playerCar = window.SB.vehicles.buildCar({ color: '#c0392b' });
    game.playerCar.group.position.set(0.5, 0, -2);
    game.playerCar.group.rotation.y = Math.PI;
    scene.add(game.playerCar.group);

    // The walker — Marco on foot, hidden while driving.
    game.walker = window.SB.people.buildPerson({
      skin: '#c98d5a', shirt: '#c0392b', pants: '#2d3748', hair: '#1c1410',
      face: { skin: '#c98d5a', smile: 0.6 },
    });
    game.walker.group.visible = false;
    scene.add(game.walker.group);
    game.walkPhase = 0;

    // Police cruisers — white with navy, five of them.
    game.cruisers = [];
    const cruiserCols = ['#e8ecf0', '#e8ecf0', '#e8ecf0', '#dfe6ee', '#e8ecf0'];
    for (let i = 0; i < 5; i++) {
      const c = window.SB.vehicles.buildCar({ color: cruiserCols[i], police: true });
      c.group.position.set(-20 - i * 8, 0, 60 + i * 6);
      c.group.rotation.y = Math.PI;
      scene.add(c.group);
      game.cruisers.push(c);
    }
    game.cruiserState = game.cruisers.map(() => ({ speed: 0, mode: 'pursue', ramTimer: 0 }));

    // The police helicopter.
    game.heli = window.SB.vehicles.buildHelicopter();
    game.heli.group.position.set(20, 26, -20);
    scene.add(game.heli.group);
    scene.add(game.heli.beam);
    game.heliTarget = new THREE.Vector3(0, 0, 0);
    // The spotlight pool: a soft additive circle on the ground.
    const poolTex = U.makeTexture(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,246,192,0.85)');
      g.addColorStop(0.6, 'rgba(255,246,192,0.28)');
      g.addColorStop(1, 'rgba(255,246,192,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    });
    game.pool = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    game.pool.rotation.x = -Math.PI / 2;
    game.pool.position.y = 0.08;
    scene.add(game.pool);

    // Traffic: eight cars on fixed routes around the grid.
    game.traffic = [];
    const trafficCols = ['#4a90d8', '#e8e8e8', '#3a3f46', '#d8a03a', '#5ab87a', '#8a6ab0', '#c8c8c8', '#b03a3a'];
    const routes = [
      { axis: 'z', lane: -5.2, dir: 1, at: -60 }, { axis: 'z', lane: -1.8, dir: -1, at: 30 },
      { axis: 'z', lane: 1.8, dir: 1, at: 90 }, { axis: 'z', lane: 5.2, dir: -1, at: -110 },
      { axis: 'x', lane: -40, dir: 1, at: -70, side: -2.5 }, { axis: 'x', lane: 40, dir: -1, at: 50, side: 2.5 },
      { axis: 'x', lane: -80, dir: -1, at: 20, side: -2.5 }, { axis: 'x', lane: 80, dir: 1, at: -30, side: 2.5 },
    ];
    routes.forEach((r, i) => {
      const car = window.SB.vehicles.buildCar({ color: trafficCols[i], profile: i % 3 === 2 ? 'van' : 'sports' });
      const pos = r.axis === 'z'
        ? { x: r.lane, z: r.at, ry: r.dir > 0 ? 0 : Math.PI }
        : { x: r.at, z: r.lane + r.side, ry: r.dir > 0 ? -Math.PI / 2 : Math.PI / 2 };
      car.group.position.set(pos.x, 0, pos.z);
      car.group.rotation.y = pos.ry;
      scene.add(car.group);
      game.traffic.push({ car: car, route: r, speed: 8 + (i % 4) * 1.5 });
    });

    // Pedestrians: twelve walkers on the sidewalks and the beach.
    game.pedestrians = [];
    const rng = U.makeRng(99);
    const looks = [
      { skin: '#f2c69b', shirt: '#e85a5a', pants: '#2d3748', hair: '#8a5a2b', hairStyle: 'long' },
      { skin: '#8d5a33', shirt: '#4a90d8', pants: '#3a3f46', hair: '#1c1410', hairStyle: 'short' },
      { skin: '#e8b07e', shirt: '#5ab87a', pants: '#2d3748', hair: '#3a2417', hairStyle: 'buzz' },
      { skin: '#c98d5a', shirt: '#f2c230', pants: '#4a4a4a', hair: '#1c1410', hairStyle: 'ponytail' },
      { skin: '#f7d7b0', shirt: '#8a6ab0', pants: '#2d3748', hair: '#b0b0b0', hairStyle: 'short' },
      { skin: '#a06a3b', shirt: '#e85a8a', pants: '#3a3f46', hair: '#5b3a1e', hairStyle: 'long' },
    ];
    for (let i = 0; i < 12; i++) {
      const look = looks[i % looks.length];
      const p = window.SB.people.buildPerson(Object.assign({}, look, { face: { skin: look.skin } }));
      const onBeach = i >= 9;
      const x = onBeach ? 100 + rng() * 25 : (i % 2 ? 10.2 : -10.2);
      const z = -150 + rng() * 300;
      p.group.position.set(x, 0, z);
      p.group.rotation.y = rng() > 0.5 ? 0 : Math.PI;
      scene.add(p.group);
      game.pedestrians.push({ person: p, dir: rng() > 0.5 ? 1 : -1, speed: 1.2 + rng() * 0.8, phase: rng() * 6, onBeach: onBeach, panic: 0 });
    }

    // The marina crew — six people, each with a job, posed at the dock.
    game.marinaCrew = [];
    const crewLooks = [
      { skin: '#c98d5a', shirt: '#2b6cb0', pants: '#2d3748', hair: '#1c1410', hairStyle: 'short', face: { skin: '#c98d5a', smile: 0.7 } },
      { skin: '#f2c69b', shirt: '#e85a8a', pants: '#3a3f46', hair: '#8a5a2b', hairStyle: 'ponytail', face: { skin: '#f2c69b', smile: 0.9, freckles: true } },
      { skin: '#8d5a33', shirt: '#5ab87a', pants: '#2d3748', hair: '#1c1410', hairStyle: 'buzz', face: { skin: '#8d5a33', smile: 0.5, beard: true } },
      { skin: '#e8b07e', shirt: '#e8a33a', pants: '#4a4a4a', hair: '#3a2417', hairStyle: 'short', face: { skin: '#e8b07e', smile: 0.6, glasses: true } },
      { skin: '#a06a3b', shirt: '#e85a5a', pants: '#2d3748', hair: '#2b2b2b', hairStyle: 'cap', face: { skin: '#a06a3b', smile: 0.4 } },
      { skin: '#f7d7b0', shirt: '#4a90d8', pants: '#3a3f46', hair: '#5b3a1e', hairStyle: 'long', face: { skin: '#f7d7b0', smile: 0.8 } },
    ];
    crewLooks.forEach((look) => {
      const p = window.SB.people.buildPerson(look);
      scene.add(p.group);
      game.marinaCrew.push(p);
    });
    // Default dock poses (the marina shot re-poses them precisely).
    poseCrew(0, 'carry');
    poseCrew(1, 'wave');
    poseCrew(2, 'talk');
    poseCrew(3, 'talk2');
    poseCrew(4, 'kneel');
    poseCrew(5, 'walk');
    const dockSpots = [[-34, 113], [-31, 113], [-29, 115], [-27, 115], [-25.5, 113.5], [-33.5, 116]];
    game.marinaCrew.forEach((c, i) => {
      c.group.position.set(dockSpots[i][0], 0.6, dockSpots[i][1]);
      c.group.rotation.y = Math.PI + (i % 2 ? -0.3 : 0.3);
    });
    // The duffel bag for the walker, and the crate for the carrier.
    const duffel = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.4, 4, 10), new THREE.MeshStandardMaterial({ color: '#d8c832', roughness: 0.8 }));
    duffel.rotation.z = Math.PI / 2;
    duffel.position.set(0.32, 0.55, 0.1);
    game.marinaCrew[5].group.add(duffel);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.9 }));
    crate.position.set(0, 1.05, 0.42);
    game.marinaCrew[0].group.add(crate);
    const wrench = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 0.9, roughness: 0.3 }));
    wrench.position.set(0.12, 0.85, 0.35);
    wrench.rotation.x = 0.6;
    game.marinaCrew[4].group.add(wrench);

    // The garage objective: a glowing ring and a light pillar on Mermaid Mile.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.18, 10, 32),
      new THREE.MeshBasicMaterial({ color: '#39ff88' })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(8, 0.3, -140);
    scene.add(ring);
    game.objectiveRing = ring;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 40, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    pillar.position.set(8, 20, -140);
    scene.add(pillar);
    game.objective = { x: 8, z: -140 };

    window.SB.hud.buildHud();
    buildTitleScreen();
    bindInput();
    loadSave();

    // Shot mode: freeze the game in the staged pose.
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      game.mode = 'play';
      game.paused = true;
      hideOverlays();
      window.SB.shots.setupShot(shot, game);
      game.shotName = shot;
    }

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let last = performance.now();
    let acc = 0;
    let frames = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (!game.paused) {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 8) {
          update(STEP);
          acc -= STEP;
          n++;
        }
      }
      updateCamera(dt);
      updateHudDom();
      renderer.render(scene, camera);
      frames++;
      if (frames === 3) window.__ready = true;
    }
    requestAnimationFrame(loop);
    window.__game = game;
  }

  // ------------------------------------------------------------------
  // Posing helpers used by the staged shots
  // ------------------------------------------------------------------
  function placeCar(car, x, y, z, ry) {
    car.group.position.set(x, y, z);
    car.group.rotation.y = ry;
  }

  function placeHeli(x, y, z, target) {
    game.heli.group.position.set(x, y, z);
    game.heliTarget.copy(target);
    game.pool.position.set(target.x, 0.08, target.z);
    aimBeam();
  }

  // Stretch the spotlight beam from the helicopter to the pool on the ground.
  function aimBeam() {
    const from = game.heli.group.position;
    const to = new THREE.Vector3(game.heliTarget.x, 0.1, game.heliTarget.z);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const beam = game.heli.beam;
    beam.position.copy(from).add(to).multiplyScalar(0.5);
    beam.scale.set(1, len, 1);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
    beam.visible = game.heli.group.visible;
  }

  function placeTraffic(i, x, z, ry) {
    const t = game.traffic[i];
    if (!t) return;
    t.car.group.position.set(x, 0, z);
    t.car.group.rotation.y = ry;
  }

  function posePedestrian(i, x, z, pose) {
    const p = game.pedestrians[i];
    if (!p) return;
    p.person.group.position.set(x, 0, z);
    p.person.group.rotation.y = 0.4;
    const P = window.SB.people;
    if (pose === 'panic') P.posePanic(p.person.pivots);
    else if (pose === 'walk') P.poseWalk(p.person.pivots, 1.2);
    else P.resetPose(p.person.pivots);
    p.panic = pose === 'panic' ? 1 : 0;
  }

  function poseCrew(i, pose) {
    const c = game.marinaCrew[i];
    if (!c) return;
    const P = window.SB.people;
    const pv = c.pivots;
    if (pose === 'carry') P.poseCarry(pv);
    else if (pose === 'wave') P.poseWave(pv);
    else if (pose === 'kneel') P.poseKneel(pv);
    else if (pose === 'talk') P.poseTalk(pv, false);
    else if (pose === 'talk2') P.poseTalk(pv, true);
    else if (pose === 'walk') P.poseWalk(pv, 2.1);
    else if (pose === 'point') P.posePoint(pv);
    else P.resetPose(pv);
  }

  function setDriving(on) {
    game.driving = on;
    game.walker.group.visible = !on;
  }

  // ------------------------------------------------------------------
  // Overlays: title, pause map, HUD visibility
  // ------------------------------------------------------------------
  function hideOverlays() {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('map-overlay').style.display = 'none';
    document.getElementById('help-overlay').style.display = 'none';
  }

  function showHud() {
    document.getElementById('hud').style.display = 'block';
    hideOverlays();
    // Draw the minimap at once: the screenshot may come before the next
    // frame's HUD refresh, and a blank minimap reads as broken.
    const mini = document.getElementById('minimap');
    if (mini) window.SB.hud.drawMinimap(mini, minimapState());
  }

  function showTitle() {
    document.getElementById('title-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
  }

  function showMap() {
    const overlay = document.getElementById('map-overlay');
    overlay.style.display = 'flex';
    const canvas = document.getElementById('big-map');
    window.SB.hud.drawBigMap(canvas, minimapState());
  }

  function buildTitleScreen() {
    const hero = window.SB.faces.paintPortrait({
      skin: '#c98d5a', hair: '#1c1410', hairStyle: 'short', shirt: '#c0392b',
    });
    document.getElementById('title-portrait').src = hero;
    document.getElementById('btn-new').addEventListener('click', () => {
      AudioSys.init();
      AudioSys.blip(660);
      startGame(false);
    });
    document.getElementById('btn-continue').addEventListener('click', () => {
      AudioSys.init();
      AudioSys.blip(660);
      startGame(true);
    });
    document.getElementById('btn-help').addEventListener('click', () => {
      document.getElementById('help-overlay').style.display = 'flex';
    });
    document.getElementById('btn-help-close').addEventListener('click', () => {
      document.getElementById('help-overlay').style.display = 'none';
    });
  }

  function startGame(useSave) {
    if (useSave) loadSave();
    game.mode = 'play';
    showHud();
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------
  function bindInput() {
    window.addEventListener('keydown', (e) => {
      game.keys[e.code] = true;
      AudioSys.init();
      if (e.code === 'KeyM' && game.mode === 'play') {
        const overlay = document.getElementById('map-overlay');
        if (overlay.style.display === 'flex') {
          overlay.style.display = 'none';
          game.paused = false;
        } else {
          showMap();
          game.paused = true;
        }
      }
      if (e.code === 'Escape') {
        document.getElementById('map-overlay').style.display = 'none';
        game.paused = false;
      }
      if (e.code === 'KeyN') {
        AudioSys.muted = !AudioSys.muted;
        if (AudioSys.master) AudioSys.master.gain.value = AudioSys.muted ? 0 : 0.35;
      }
      if (e.code === 'KeyE' && game.mode === 'play') toggleEnterExit();
      if (e.code === 'KeyZ' && game.mode === 'play') crewAbility('plates');
      if (e.code === 'KeyX' && game.mode === 'play') crewAbility('fix');
      if (e.code === 'KeyC' && game.mode === 'play') crewAbility('eyes');
      if (e.code === 'KeyR' && game.mode === 'play') {
        AudioSys.blip(880);
        window.SB.hud.showPopup('radio', 'SIRENA FM 99.7 · "Night Drive"');
      }
    });
    window.addEventListener('keyup', (e) => { game.keys[e.code] = false; });
    let dragging = false;
    let lx = 0, ly = 0;
    window.addEventListener('mousedown', (e) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      AudioSys.init();
      if (game.mode === 'play' && e.button === 0) shoot();
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      game.camYaw -= (e.clientX - lx) * 0.004;
      game.camPitch = U.clamp(game.camPitch + (e.clientY - ly) * 0.003, -0.3, 0.5);
      lx = e.clientX;
      ly = e.clientY;
    });
  }

  function toggleEnterExit() {
    if (game.driving) {
      setDriving(false);
      const p = game.playerCar.group.position;
      game.walker.group.position.set(p.x + 1.6, 0, p.z + 0.5);
      game.walker.group.rotation.y = game.playerCar.group.rotation.y;
      game.playerSpeed = 0;
    } else {
      const wp = game.walker.group.position;
      const cp = game.playerCar.group.position;
      const d = Math.hypot(wp.x - cp.x, wp.z - cp.z);
      if (d < 4) {
        setDriving(true);
        AudioSys.blip(440);
      }
    }
  }

  function crewAbility(kind) {
    const now = game.time;
    if (kind === 'plates' && now - (game.lastPlates || -99) > 30) {
      game.lastPlates = now;
      game.state.stars = Math.max(0, game.state.stars - 1);
      window.SB.hud.showPopup('crew', 'PILAR SWAPPED THE PLATES · -1 ★');
      AudioSys.blip(520);
    }
    if (kind === 'fix') {
      game.state.condition = Math.min(100, game.state.condition + 25);
      window.SB.hud.showPopup('crew', 'TOMAS PATCHED THE MANTA · +25%');
      AudioSys.blip(520);
    }
    if (kind === 'eyes') {
      window.SB.hud.showPopup('crew', 'NADIA: ROADBLOCK AHEAD ON MERMAID MILE');
      AudioSys.blip(520);
    }
  }

  function shoot() {
    // A hitscan shot: a tracer line from the car toward the aim, and a hit
    // puff on the nearest cruiser inside a cone ahead of the player.
    AudioSys.blip(180);
    const origin = game.playerCar.group.position.clone();
    origin.y = 1.2;
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(game.playerCar.group.quaternion);
    const geo = new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(dir.clone().multiplyScalar(30))]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.9 }));
    game.scene.add(line);
    setTimeout(() => game.scene.remove(line), 90);
    let best = null;
    let bestD = 30;
    game.cruisers.forEach((c) => {
      const d = c.group.position.distanceTo(origin);
      const to = c.group.position.clone().sub(origin).normalize();
      if (d < bestD && to.dot(dir) > 0.92) {
        best = c;
        bestD = d;
      }
    });
    if (best) {
      best.group.position.y += 0.02;
      window.SB.hud.showPopup('hit', 'HIT · ' + Math.round(bestD) + ' m');
      addWanted(1);
    }
  }

  // ------------------------------------------------------------------
  // Wanted, collisions, missions
  // ------------------------------------------------------------------
  function addWanted(n) {
    if (game.wantedCooldown > 0) return;
    game.wantedCooldown = 2;
    game.state.stars = Math.min(5, game.state.stars + n);
    game.hiddenTimer = 0;
  }

  function collideBuildings(pos, radius) {
    for (const b of game.buildings) {
      const hw = b.w / 2 + radius;
      const hd = b.d / 2 + radius;
      if (Math.abs(pos.x - b.x) < hw && Math.abs(pos.z - b.z) < hd) {
        const dx = pos.x - b.x;
        const dz = pos.z - b.z;
        const px = hw - Math.abs(dx);
        const pz = hd - Math.abs(dz);
        if (px < pz) pos.x = b.x + (dx > 0 ? hw : -hw);
        else pos.z = b.z + (dz > 0 ? hd : -hd);
        return true;
      }
    }
    return false;
  }

  function update(dt) {
    game.time += dt;
    if (game.wantedCooldown > 0) game.wantedCooldown -= dt;
    const S = game.state;
    const keys = game.keys;

    if (game.mode === 'play') {
      if (game.driving) updateDriving(dt);
      else updateWalking(dt);
      updateTraffic(dt);
      updatePedestrians(dt);
      updatePolice(dt);
      updateHeli(dt);
      updateMission(dt);
      // Stars fade when no police can see the player for a while.
      const nearest = nearestPoliceDist();
      if (nearest > 60) {
        game.hiddenTimer += dt;
        if (game.hiddenTimer > 12 && S.stars > 0) {
          S.stars -= 1;
          game.hiddenTimer = 0;
          window.SB.hud.showPopup('crew', 'YOU LOST THEM · -1 ★');
        }
      } else {
        game.hiddenTimer = 0;
      }
    }
    // The objective ring pulses; the rotors always spin.
    game.objectiveRing.rotation.z += dt * 0.8;
    game.heli.rotor.rotation.y += dt * 22;
    game.heli.tailRotor.rotation.x += dt * 30;
    AudioSys.update(dt);
  }

  function updateDriving(dt) {
    const S = game.state;
    const keys = game.keys;
    const car = game.playerCar.group;
    const forward = keys['KeyW'] || keys['ArrowUp'];
    const back = keys['KeyS'] || keys['ArrowDown'];
    const left = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];
    const brake = keys['Space'];
    const maxSpeed = 52;
    if (forward) game.playerSpeed += 15 * dt;
    if (back) game.playerSpeed -= 12 * dt;
    if (brake) game.playerSpeed -= Math.sign(game.playerSpeed) * 26 * dt;
    game.playerSpeed -= game.playerSpeed * 0.35 * dt;
    game.playerSpeed = U.clamp(game.playerSpeed, -12, maxSpeed);
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    const grip = brake ? 0.45 : 1;
    const speedFactor = U.clamp(Math.abs(game.playerSpeed) / 14, 0, 1);
    game.playerHeading += steer * 1.7 * speedFactor * grip * dt * Math.sign(game.playerSpeed || 1);
    // Drift: the heading lags the velocity when the handbrake is on.
    if (brake && Math.abs(game.playerSpeed) > 18 && Math.random() < 0.02) {
      window.SB.hud.showPopup('drift', 'DRIFT x3');
      S.cash += 250;
    }
    const dir = new THREE.Vector3(Math.sin(game.playerHeading), 0, Math.cos(game.playerHeading));
    const pos = car.position;
    pos.x += dir.x * game.playerSpeed * dt;
    pos.z += dir.z * game.playerSpeed * dt;
    pos.x = U.clamp(pos.x, -168, 168);
    pos.z = U.clamp(pos.z, -168, 168);
    if (collideBuildings(pos, 1.6)) {
      if (Math.abs(game.playerSpeed) > 8) {
        S.condition = Math.max(0, S.condition - 3);
        addWanted(1);
        window.SB.hud.showPopup('hit', 'CRASH · -3% CONDITION');
        AudioSys.blip(120);
      }
      game.playerSpeed *= -0.25;
    }
    car.rotation.y = game.playerHeading;
    game.playerCar.wheels.forEach((w) => { w.rotation.x += game.playerSpeed * dt / 0.34; });
    S.speed = Math.abs(game.playerSpeed) * 3.6;
    updateDistrict(pos);
  }

  function updateWalking(dt) {
    const keys = game.keys;
    const w = game.walker.group;
    let mx = 0, mz = 0;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    const run = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = run ? 7 : 3.6;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      const pos = w.position;
      pos.x += mx * speed * dt;
      pos.z += mz * speed * dt;
      pos.x = U.clamp(pos.x, -168, 168);
      pos.z = U.clamp(pos.z, -168, 168);
      collideBuildings(pos, 0.5);
      w.rotation.y = Math.atan2(mx, mz);
      game.walkPhase += dt * speed * 1.6;
      window.SB.people.poseWalk(game.walker.pivots, game.walkPhase);
      game.state.speed = speed * 3.6;
    } else {
      window.SB.people.resetPose(game.walker.pivots);
      game.state.speed = 0;
    }
    updateDistrict(w.position);
  }

  function updateDistrict(pos) {
    const S = game.state;
    if (pos.x > 95) { S.district = 'PALM BEACH'; S.street = 'Shoreline Drive'; }
    else if (pos.z > 100) { S.district = 'THE MARINA'; S.street = 'Mermaid Mile'; }
    else if (Math.abs(pos.x) < 8) { S.district = 'SUNSET QUAY'; S.street = 'Mermaid Mile'; }
    else if (pos.x < 0) { S.district = 'OLD HARBOUR'; S.street = 'Coral Street'; }
    else { S.district = 'SUNSET QUAY'; S.street = 'Palm Avenue'; }
  }

  function updateTraffic(dt) {
    game.traffic.forEach((t) => {
      const g = t.car.group;
      const r = t.route;
      if (r.axis === 'z') {
        g.position.z += r.dir * t.speed * dt;
        if (g.position.z > 170) g.position.z = -170;
        if (g.position.z < -170) g.position.z = 170;
      } else {
        g.position.x += r.dir * t.speed * dt;
        if (g.position.x > 170) g.position.x = -170;
        if (g.position.x < -170) g.position.x = 170;
      }
      t.car.wheels.forEach((w) => { w.rotation.x += t.speed * dt / 0.34; });
    });
  }

  function updatePedestrians(dt) {
    game.pedestrians.forEach((p) => {
      if (p.panic) return;
      const g = p.person.group;
      g.position.z += p.dir * p.speed * dt;
      if (g.position.z > 160) { g.position.z = 160; p.dir = -1; g.rotation.y = Math.PI; }
      if (g.position.z < -160) { g.position.z = -160; p.dir = 1; g.rotation.y = 0; }
      p.phase += dt * p.speed * 2.2;
      window.SB.people.poseWalk(p.person.pivots, p.phase);
    });
  }

  function nearestPoliceDist() {
    const p = game.playerCar.group.position;
    let best = Infinity;
    game.cruisers.forEach((c) => {
      best = Math.min(best, c.group.position.distanceTo(p));
    });
    return best;
  }

  function updatePolice(dt) {
    const S = game.state;
    const target = game.driving ? game.playerCar.group.position : game.walker.group.position;
    const active = S.stars >= 1 ? Math.min(1 + S.stars, 5) : 0;
    game.cruisers.forEach((c, i) => {
      const st = game.cruiserState[i];
      const g = c.group;
      if (i >= active) {
        // Idle units cruise slowly along the boulevard.
        g.position.z += 6 * dt;
        if (g.position.z > 170) g.position.z = -170;
        st.speed = 6;
        return;
      }
      // Pursue: steer toward the player with a per-unit offset.
      const off = new THREE.Vector3(((i % 2) ? 1 : -1) * (2 + (i % 3)), 0, -4 - (i % 3) * 3);
      const want = target.clone().add(off);
      const to = want.clone().sub(g.position);
      const dist = to.length();
      const desired = Math.atan2(to.x, to.z);
      let dh = desired - g.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      g.rotation.y += U.clamp(dh, -1.6 * dt, 1.6 * dt);
      // Ram: a burst of speed when close.
      if (dist < 9 && st.ramTimer <= 0) st.ramTimer = 1.2;
      if (st.ramTimer > 0) st.ramTimer -= dt;
      const topSpeed = st.ramTimer > 0 ? 40 : 30;
      st.speed = U.clamp(st.speed + (dist > 4 ? 12 : -20) * dt, 0, topSpeed);
      const fwd = new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
      g.position.x += fwd.x * st.speed * dt;
      g.position.z += fwd.z * st.speed * dt;
      g.position.x = U.clamp(g.position.x, -168, 168);
      g.position.z = U.clamp(g.position.z, -168, 168);
      c.wheels.forEach((w) => { w.rotation.x += st.speed * dt / 0.34; });
      // A cruiser that touches the player dents the car.
      if (g.position.distanceTo(target) < 3.2 && game.driving) {
        S.condition = Math.max(0, S.condition - 0.06);
      }
    });
  }

  function updateHeli(dt) {
    const S = game.state;
    const target = game.driving ? game.playerCar.group.position : game.walker.group.position;
    const active = S.stars >= 3;
    game.heli.group.visible = active || game.shotName === 'chase';
    game.pool.visible = active || game.shotName === 'chase';
    if (!active && game.shotName !== 'chase') return;
    const want = new THREE.Vector3(target.x + 6, 24, target.z - 8);
    game.heli.group.position.lerp(want, 1 - Math.pow(0.02, dt));
    game.heliTarget.lerp(target, 1 - Math.pow(0.02, dt));
    game.pool.position.set(game.heliTarget.x, 0.08, game.heliTarget.z);
    game.heli.group.lookAt(target.x, 24, target.z);
    aimBeam();
  }

  function updateMission(dt) {
    const S = game.state;
    const pos = game.driving ? game.playerCar.group.position : game.walker.group.position;
    const d = Math.hypot(pos.x - game.objective.x, pos.z - game.objective.z);
    if (d < 5 && S.stage === 3) {
      if (S.stars <= 1) {
        S.stage = 4;
        S.cash += 5000;
        S.respect = Math.min(S.respectMax, S.respect + 460);
        window.SB.hud.showPopup('crew', 'JOB DONE · +$5,000 · RESPECT UP');
        document.getElementById('hud-dialog-line').textContent =
          'Clean run, Mako. The garage has the Manta — come by the marina when you are ready for the next one.';
        AudioSys.blip(990);
      }
    }
  }

  // ------------------------------------------------------------------
  // Camera + HUD refresh
  // ------------------------------------------------------------------
  function updateCamera(dt) {
    if (game.shotName) return; // staged shots hold their own camera
    const cam = game.camera;
    let anchor;
    let heading;
    if (game.driving) {
      anchor = game.playerCar.group.position;
      heading = game.playerHeading;
    } else {
      anchor = game.walker.group.position;
      heading = game.walker.group.rotation.y;
    }
    const yaw = heading + Math.PI + game.camYaw;
    const dist = game.driving ? 11 : 6;
    const height = game.driving ? 4.6 : 3.0;
    const want = new THREE.Vector3(
      anchor.x + Math.sin(yaw) * dist,
      anchor.y + height + game.camPitch * 4,
      anchor.z + Math.cos(yaw) * dist
    );
    cam.position.lerp(want, 1 - Math.pow(0.001, dt));
    cam.lookAt(anchor.x, anchor.y + 1.2, anchor.z);
  }

  function minimapState() {
    const pos = game.driving ? game.playerCar.group.position : game.walker.group.position;
    return {
      player: { x: pos.x, z: pos.z, heading: game.driving ? -game.playerHeading : -game.walker.group.rotation.y },
      objective: game.objective,
      police: game.cruisers.map((c) => ({ x: c.group.position.x, z: c.group.position.z }))
        .concat(game.state.stars >= 3 ? [{ x: game.heli.group.position.x, z: game.heli.group.position.z, air: true }] : []),
    };
  }

  let hudTick = 0;
  function updateHudDom() {
    if (game.mode !== 'play') return;
    hudTick++;
    const S = game.state;
    const distances = {};
    const target = game.driving ? game.playerCar.group.position : game.walker.group.position;
    window.SB.hud.UNITS.forEach((u, i) => {
      if (i < game.cruisers.length) {
        distances[u.name] = game.cruisers[i].group.position.distanceTo(target);
      } else if (u.name === 'AIR-9') {
        distances[u.name] = game.heli.group.position.distanceTo(target);
      } else {
        distances[u.name] = 92;
      }
    });
    window.SB.hud.updateHud({
      speed: S.speed, health: S.health, armor: S.armor, stars: S.stars,
      cash: S.cash, condition: S.condition, distances: distances,
      district: S.district, street: S.street,
    });
    const inSight = document.getElementById('hud-insight');
    inSight.style.display = S.stars >= 3 ? 'block' : 'none';
    // The minimap redraws every frame: it is a small canvas, and the
    // screenshot must never catch it blank.
    const mini = document.getElementById('minimap');
    if (mini) window.SB.hud.drawMinimap(mini, minimapState());
  }

  // ------------------------------------------------------------------
  // Save / load
  // ------------------------------------------------------------------
  function saveGame() {
    try {
      const pos = game.playerCar.group.position;
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: game.state.cash, stars: game.state.stars, stage: game.state.stage,
        x: pos.x, z: pos.z,
      }));
    } catch (e) { /* private mode: the game plays without a save */ }
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      game.state.cash = s.cash;
      game.state.stars = s.stars;
      game.state.stage = s.stage;
      if (s.x !== undefined) {
        game.playerCar.group.position.set(s.x, 0, s.z);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  setInterval(() => { if (game.mode === 'play') saveGame(); }, 15000);
  window.addEventListener('beforeunload', () => { if (game.mode === 'play') saveGame(); });

  // Expose the helpers the staged shots use.
  game.placeCar = placeCar;
  game.placeHeli = placeHeli;
  game.placeTraffic = placeTraffic;
  game.posePedestrian = posePedestrian;
  game.poseCrew = poseCrew;
  game.setDriving = setDriving;
  game.showHud = showHud;
  game.showTitle = showTitle;
  game.showMap = showMap;
  game.setPopup = (kind, text) => {
    const box = document.getElementById('hud-popup');
    box.textContent = text;
    box.className = 'hud-popup show ' + kind;
  };
  game.setPopup2 = (kind, text) => {
    const box = document.getElementById('hud-popup2');
    box.textContent = text;
    box.className = 'hud-popup show ' + kind;
  };

  window.SB.game = game;
  window.addEventListener('DOMContentLoaded', init);
})();
