// SOLSTICE BAY — main game: renderer, chase camera, arcade driving, police
// pursuit, pedestrians, traffic, missions, HUD, minimap, saves and the four
// staged screenshot modes (?shot=chase|title|map|marina).
window.SB = window.SB || {};
(function () {
  const CFG = SB.CFG;
  const params = new URLSearchParams(location.search);
  const SHOT = params.get('shot') || '';
  const FROZEN = SHOT === 'chase' || SHOT === 'marina';
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));

  // ---------- renderer / scene / camera ----------
  const root = document.getElementById('game-root');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcf7a5e, 130, 400);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 8, 52);

  // ---------- lights: low warm sun + purple sky fill ----------
  const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
  sun.position.set(-90, 70, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0x8a6bbf, 0x8a6a4a, 0.95));
  scene.add(new THREE.AmbientLight(0x604a6a, 0.35));

  // ---------- world ----------
  const world = SB.buildCity(scene);

  // ---------- vehicles ----------
  const cars = { cruisers: [] };
  function placeCar(car, x, z, heading) {
    car.position.set(x, 0, z);
    car.rotation.y = heading;
    scene.add(car);
    return car;
  }
  // hero faces -Z (north): forward +X rotated by PI/2
  const NORTH = Math.PI / 2;
  cars.hero = placeCar(SB.Models.car({ color: CFG.car.color }), 0, 30, NORTH);
  const cruiserCols = [0xf2f2f2, 0xf2f2f2, 0xe8e8e8, 0xf2f2f2];
  const cruiserSpots = [[-6, 8], [7, 2], [-8, 32], [8, 38]];
  for (let i = 0; i < 4; i++) {
    const c = SB.Models.car({ color: cruiserCols[i], police: true });
    placeCar(c, cruiserSpots[i][0], cruiserSpots[i][1], NORTH);
    c.userData.chaseOffset = i;
    cars.cruisers.push(c);
  }
  // traffic: cars looping rectangular routes around blocks
  const traffic = [];
  const trafficCols = [0x3a6ea8, 0xd8d8d8, 0x2e8b6a, 0xe8a33c, 0x6a4a8a, 0xb03a3a, 0x4a4a4a, 0x8ab8d8];
  const loops = [
    [[0, 0], [44, 0], [44, 44], [0, 44]],
    [[-44, -44], [0, -44], [0, 0], [-44, 0]],
    [[44, -88], [88, -88], [88, -44], [44, -44]],
    [[-88, 44], [-44, 44], [-44, 88], [-88, 88]],
  ];
  for (let i = 0; i < 8; i++) {
    const loop = loops[i % loops.length];
    const car = SB.Models.car({ color: trafficCols[i] });
    const start = loop[i % 4];
    car.position.set(start[0] + 3.5, 0, start[1] + 3.5);
    car.rotation.y = NORTH;
    scene.add(car);
    traffic.push({ car, loop, seg: i % 4, t: 0.15 * i, speed: 7 + (i % 3) });
  }

  // ---------- helicopter + spotlight ----------
  const heli = SB.Models.heli();
  heli.scale.setScalar(1.9);
  heli.position.set(6, 27, -6);
  heli.rotation.y = Math.PI / 2 + 0.4;
  scene.add(heli);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 24),
    new THREE.MeshBasicMaterial({ map: SB.TEX.pool(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(2, 0.08, 12);
  scene.add(pool);
  const police = { heli, beam: heli.userData.beam, pool };

  // ---------- pedestrians ----------
  const peds = { list: [], crew: [] };
  const pedDefs = [
    { skin: '#8d5a3b', shirt: '#e84c6a', hair: '#1c1410', x: -12, z: 18, panic: true },
    { skin: '#f0c297', shirt: '#4c7de8', hair: '#5a3a1a', x: 12, z: 24, panic: true },
    { skin: '#c98d64', shirt: '#e8b64c', hair: '#2a1a12', x: -20, z: -10 },
    { skin: '#6b4530', shirt: '#3fae8a', hair: '#0f0a08', x: 20, z: -30 },
    { skin: '#f0c297', shirt: '#c04ce8', hair: '#8a5a2a', x: -24, z: 60 },
    { skin: '#8d5a3b', shirt: '#e8e4da', hair: '#1c1410', x: 24, z: 70 },
    { skin: '#c98d64', shirt: '#2e8b6a', hair: '#3a2a1a', x: -60, z: 10 },
    { skin: '#f0c297', shirt: '#e84c6a', hair: '#2a1a12', x: 60, z: -10 },
    { skin: '#6b4530', shirt: '#4c7de8', hair: '#0f0a08', x: -60, z: -50 },
    { skin: '#8d5a3b', shirt: '#e8a33c', hair: '#1c1410', x: 60, z: 50 },
    { skin: '#c98d64', shirt: '#8a6bbf', hair: '#5a3a1a', x: -100, z: 30 },
    { skin: '#f0c297', shirt: '#3fae8a', hair: '#8a5a2a', x: 100, z: 30 },
    { skin: '#8d5a3b', shirt: '#e8e4da', hair: '#1c1410', x: -140, z: 90 },
    { skin: '#c98d64', shirt: '#e84c6a', hair: '#2a1a12', x: -145, z: 70 },
  ];
  for (const d of pedDefs) {
    const p = SB.Models.person({ skin: d.skin, shirt: d.shirt, hair: d.hair, pose: d.panic ? 'panic' : 'walk', scale: 0.92 + Math.random() * 0.14 });
    p.position.set(d.x, 0, d.z);
    p.rotation.y = Math.random() * Math.PI * 2;
    scene.add(p);
    peds.list.push({ g: p, x0: d.x, z0: d.z, dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * 6, panic: !!d.panic });
  }
  // marina crew: hero + 3 crew standing on the platform, facing the camera (+X)
  const marinaCrewDefs = [
    { skin: '#c98d64', shirt: '#c2242e', hair: '#1c1410', hairStyle: 'cap', capColor: '#c2242e' },
    { skin: '#8d5a3b', shirt: '#e8b64c', hair: '#1c1410' },
    { skin: '#c98d64', shirt: '#4c9e8f', hair: '#5a3a1a' },
    { skin: '#f0c297', shirt: '#e86a92', hair: '#2a1a12', hairStyle: 'bun' },
  ];
  marinaCrewDefs.forEach((d, i) => {
    const p = SB.Models.person(d);
    p.position.set(-152, 0.5, 88.5 + i * 2.4);
    p.rotation.y = 0; // faces +X, toward the marina camera
    scene.add(p);
    peds.crew.push(p);
  });
  // hero on-foot model (hidden until the player exits the car)
  const heroPed = SB.Models.person({ skin: '#c98d64', shirt: '#c2242e', hair: '#1c1410', hairStyle: 'cap', capColor: '#c2242e' });
  heroPed.visible = false;
  scene.add(heroPed);

  // ---------- mission markers (glowing beacons) ----------
  const stages = [
    { name: 'Steal the Meridian', done: true },
    { name: 'Reach the garage on Marlin Avenue', at: [44, -88] },
    { name: 'Drop the plates at the docks', at: [-88, -44] },
    { name: 'Meet Gus at the casino roof', at: [88, 88] },
  ];
  let stageIdx = 1;
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 30, 16, 1, true), beaconMat);
  beacon.position.set(stages[1].at[0], 15, stages[1].at[1]);
  scene.add(beacon);

  // ---------- state ----------
  const game = {
    ready: false, errors, scene, renderer, onFoot: false, heroPed,
    started: false, paused: false, money: CFG.money, wanted: CFG.wanted,
    speed: 0, heading: NORTH, drift: false, radioIdx: 0, timeLeft: 192,
  };
  let camYaw = 0, camPitch = 0, dragging = false, lastX = 0, lastY = 0;
  let popupTimer = 0;

  // ---------- HUD ----------
  const $ = (id) => document.getElementById(id);
  const fmt$ = (n) => '$' + n.toLocaleString('en-US');
  function buildHUD() {
    $('mission-title').textContent = CFG.mission.job + ' · ' + CFG.mission.title;
    $('mission-obj').textContent = CFG.mission.objective;
    $('mission-stage').textContent = CFG.mission.stage;
    $('mission-time').textContent = CFG.mission.time;
    $('mission-next').textContent = 'NEXT  ' + CFG.mission.next;
    const dp = $('dispatch-rows');
    CFG.police.units.forEach((u) => {
      const row = document.createElement('div');
      row.className = 'd-row';
      row.innerHTML = '<span class="d-name">' + u.name + '</span><span class="d-tac t-' + u.tactic.toLowerCase() + '">' + u.tactic + '</span><span class="d-dist">' + u.dist + ' m</span>';
      dp.appendChild(row);
    });
    $('dispatch-code').textContent = CFG.police.total + ' UNITS · CODE ' + CFG.police.code;
    const wp = $('weapon-slots');
    CFG.weapons.forEach((w) => {
      const s = document.createElement('div');
      s.className = 'w-slot' + (w.active ? ' active' : '');
      s.innerHTML = '<span class="w-ico">' + weaponSVG(w.icon) + '</span><span class="w-name">' + w.name + '</span><span class="w-ammo">' + w.ammo + '</span>';
      wp.appendChild(s);
    });
    const cp = $('crew-cards');
    CFG.crew.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'crew-card';
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      cv.getContext('2d').drawImage(SB.TEX.face({ skin: c.skin, hair: c.hair, shirt: c.shirt }), 0, 0, 64, 64);
      card.appendChild(cv);
      const t = document.createElement('div');
      t.className = 'crew-text';
      t.innerHTML = '<b>' + c.key + ' · ' + c.action + '</b><span>' + c.name + ' · ' + c.role + '</span>';
      card.appendChild(t);
      cp.appendChild(card);
    });
    $('money').textContent = fmt$(game.money);
    $('district').textContent = 'CASINO STRIP';
    $('street').textContent = 'Solstice Boulevard';
    $('carname').textContent = CFG.car.name;
    $('condition').style.width = CFG.car.condition + '%';
    $('condition-num').textContent = CFG.car.condition + '%';
    $('rep-name').textContent = 'REP ' + CFG.hero.rep + ' · ' + CFG.hero.repName;
    $('rep-bar').style.width = Math.round(CFG.hero.xp / CFG.hero.xpMax * 100) + '%';
    $('rep-xp').textContent = CFG.hero.xp.toLocaleString() + ' / ' + CFG.hero.xpMax.toLocaleString() + ' XP';
    $('radio').textContent = '♪ ' + CFG.radio[0].name + ' — ' + CFG.radio[0].song;
    $('dialog-name').textContent = CFG.fixer.name + ' · ' + CFG.fixer.role;
    $('dialog-text').textContent = CFG.fixer.line;
    $('dialog-face').getContext('2d').drawImage(SB.TEX.face({ skin: '#c98d64', hair: '#8a8a8a', shirt: '#8a6a2a', smile: false }), 0, 0, 72, 72);
    $('popup').innerHTML = '<span class="pop-big">DRIFT x3</span><span class="pop-small">NEAR MISS +$250</span>';
    buildPauseMenu();
  }
  function weaponSVG(kind) {
    const paths = {
      fist: '<circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="14" r="3" fill="currentColor"/>',
      pistol: '<path d="M4 10 h14 v4 h-4 l-2 6 h-4 l1-6 H4 z" fill="currentColor"/>',
      smg: '<path d="M3 12 h18 v3 h-6 l-1 4 h-3 l1-4 H8 l-1 3 H4 l1-3 H3 z" fill="currentColor"/>',
      shotgun: '<path d="M2 11 h22 v3 H2 z M8 14 l-2 5 h3 l2-5 z" fill="currentColor"/>',
      rifle: '<path d="M2 12 h20 v3 h-8 l-1 4 h-3 l1-4 H6 l-1 3 H2 z" fill="currentColor"/>',
      rpg: '<path d="M2 12 h16 v4 H2 z M18 10 h8 v8 h-8 z" fill="currentColor"/>',
    };
    return '<svg viewBox="0 0 28 28" width="26" height="26">' + (paths[kind] || paths.fist) + '</svg>';
  }
  function buildPauseMenu() {
    $('pause-title').textContent = CFG.city + ' — PAUSED';
    const ml = $('mission-list');
    ml.innerHTML = '';
    stages.forEach((s, i) => {
      const li = document.createElement('li');
      li.className = i === stageIdx ? 'current' : (s.done ? 'done' : '');
      li.textContent = (s.done ? '✓ ' : (i === stageIdx ? '▶ ' : '○ ')) + 'STAGE ' + (i + 1) + '/4 · ' + s.name;
      ml.appendChild(li);
    });
    $('career').innerHTML = 'Completion 41% · Missions 9/22 · Jobs done 5 · Near misses 18 · Top speed 148 km/h · Cash earned $48,210';
    const saves = $('save-slots');
    saves.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const b = document.createElement('button');
      const data = localStorage.getItem('solstice-bay-save-' + i);
      b.className = 'save-slot';
      b.textContent = 'SAVE ' + i + ' · ' + (data ? 'SOLSTICE BAY · ' + JSON.parse(data).money : 'EMPTY SLOT');
      b.onclick = () => { saveGame(i); b.textContent = 'SAVE ' + i + ' · SOLSTICE BAY · ' + fmt$(game.money); SB.Audio.blip(660); };
      saves.appendChild(b);
    }
    drawBigMap();
  }
  function saveGame(slot) {
    localStorage.setItem('solstice-bay-save-' + slot, JSON.stringify({
      money: game.money, stage: stageIdx, rep: CFG.hero.rep, condition: CFG.car.condition, at: Date.now(),
    }));
  }
  function loadSave(slot) {
    const raw = localStorage.getItem('solstice-bay-save-' + slot);
    if (!raw) return false;
    const d = JSON.parse(raw);
    game.money = d.money; stageIdx = d.stage;
    $('money').textContent = fmt$(game.money);
    return true;
  }

  // ---------- minimap + big map (canvas 2D) ----------
  function drawMapCanvas(cv, scale, cx, cz, withLabels) {
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.fillStyle = '#10141c';
    g.fillRect(0, 0, W, H);
    const px = (x) => (x - cx) * scale + W / 2;
    const pz = (z) => (z - cz) * scale + H / 2;
    // water + beach (west)
    g.fillStyle = '#1d5a72';
    g.fillRect(0, 0, Math.max(0, px(-164)), H);
    g.fillStyle = '#c9b078';
    g.fillRect(Math.max(0, px(-164)), 0, Math.max(0, px(-140) - px(-164)), H);
    // blocks
    g.fillStyle = '#232a33';
    for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) {
      g.fillRect(px(i * 44 + 22 - 15), pz(j * 44 + 22 - 15), 30 * scale, 30 * scale);
    }
    // roads
    g.strokeStyle = '#4a545e';
    g.lineWidth = Math.max(2, 14 * scale * 0.5);
    for (let i = -4; i <= 4; i++) {
      g.beginPath(); g.moveTo(px(i * 44), 0); g.lineTo(px(i * 44), H); g.stroke();
      g.beginPath(); g.moveTo(0, pz(i * 44)); g.lineTo(W, pz(i * 44)); g.stroke();
    }
    if (withLabels) {
      g.fillStyle = '#ffd94d';
      g.font = 'bold ' + Math.max(10, 13 * scale) + 'px Arial';
      g.fillText('SUNSET DOCKS', px(-150), pz(0));
      g.fillText('CASINO STRIP', px(88), pz(-40));
      g.fillText('PALM HEIGHTS', px(0), pz(-130));
      g.fillText('OLD MARINA', px(-40), pz(130));
      g.fillText('HARBOR LIGHTS', px(-10), pz(20));
    }
    // GPS route: hero -> current stage marker
    const target = stages[stageIdx] && stages[stageIdx].at;
    const hx = cars.hero.position.x, hz = cars.hero.position.z;
    if (target) {
      g.strokeStyle = '#3dff88';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(px(hx), pz(hz));
      g.lineTo(px(target[0]), pz(hz));
      g.lineTo(px(target[0]), pz(target[1]));
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffd94d';
      g.beginPath(); g.arc(px(target[0]), pz(target[1]), 6, 0, Math.PI * 2); g.fill();
    }
    // police blips
    g.fillStyle = '#ff4040';
    for (const c of cars.cruisers) {
      g.beginPath(); g.arc(px(c.position.x), pz(c.position.z), 4, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#40a0ff';
    g.beginPath(); g.arc(px(heli.position.x), pz(heli.position.z), 5, 0, Math.PI * 2); g.fill();
    // player arrow
    g.save();
    g.translate(px(hx), pz(hz));
    g.rotate(-game.heading + Math.PI / 2);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.restore();
    // north
    g.fillStyle = '#ffffff';
    g.font = 'bold 13px Arial';
    g.fillText('N', 10, 18);
  }
  function drawMinimap() {
    const cv = $('minimap');
    drawMapCanvas(cv, cv.width / 240, cars.hero.position.x, cars.hero.position.z, false);
  }
  function drawBigMap() {
    const cv = $('bigmap');
    drawMapCanvas(cv, cv.width / 460, 0, 0, true);
  }

  // ---------- district / street ----------
  function locate() {
    const x = cars.hero.position.x, z = cars.hero.position.z;
    let d = 'Harbor Lights';
    if (x < -140) d = 'Sunset Docks';
    else if (z < -88) d = 'Palm Heights';
    else if (x > 88) d = 'Casino Strip';
    else if (z > 88) d = 'Old Marina';
    const street = Math.abs(x - Math.round(x / 44) * 44) < Math.abs(z - Math.round(z / 44) * 44)
      ? 'Solstice Boulevard' : 'Marlin Avenue';
    $('district').textContent = d.toUpperCase();
    $('street').textContent = street;
  }

  // ---------- input ----------
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyM') togglePause();
    if (e.code === 'KeyR') cycleRadio();
    if (e.code === 'KeyN') SB.Audio.toggleMute();
    if (e.code === 'KeyE') toggleEnterExit();
    if (e.code === 'KeyF') crewAction();
    if (e.code === 'Escape' && game.paused) togglePause();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    camYaw -= (e.clientX - lastX) * 0.005;
    camPitch = Math.max(-0.5, Math.min(0.6, camPitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });
  $('btn-start').addEventListener('click', startGame);
  $('btn-continue').addEventListener('click', () => { loadSave(1); startGame(); });
  function startGame() {
    SB.Audio.init();
    SB.Audio.jingle();
    $('title-screen').style.display = 'none';
    game.started = true;
    SB.Audio.setSiren(true);
  }
  function togglePause() {
    if (!game.started && SHOT !== 'map') return;
    game.paused = !game.paused;
    $('pause-menu').style.display = game.paused ? 'flex' : 'none';
    if (game.paused) drawBigMap();
    SB.Audio.blip(game.paused ? 520 : 760);
  }
  function cycleRadio() {
    game.radioIdx = (game.radioIdx + 1) % CFG.radio.length;
    const r = CFG.radio[game.radioIdx];
    $('radio').textContent = '♪ ' + r.name + ' — ' + r.song;
    SB.Audio.jingle();
  }
  function crewAction() {
    showPopup('CREW ACTION', 'Lena swaps the plates — heat drops for 30s');
    SB.Audio.blip(990);
  }
  function toggleEnterExit() {
    if (!game.started) return;
    if (!game.onFoot) {
      game.onFoot = true;
      heroPed.visible = true;
      heroPed.position.set(cars.hero.position.x - 2.2, 0, cars.hero.position.z + 1.5);
      heroPed.rotation.y = game.heading;
      SB.Audio.setEngine(0, false);
    } else {
      const d = Math.hypot(heroPed.position.x - cars.hero.position.x, heroPed.position.z - cars.hero.position.z);
      if (d < 5) {
        game.onFoot = false;
        heroPed.visible = false;
      }
    }
    SB.Audio.blip(700);
  }
  function showPopup(big, small) {
    $('popup').innerHTML = '<span class="pop-big">' + big + '</span><span class="pop-small">' + small + '</span>';
    $('popup').style.opacity = '1';
    popupTimer = 3;
  }

  // ---------- camera ----------
  const camPos = new THREE.Vector3(0, 8, 52);
  const camLook = new THREE.Vector3(0, 2, 0);
  function updateCamera(dt) {
    if (SHOT === 'chase' && FROZEN) {
      // staged cover shot: fixed camera, all 4 cruisers + heli in frame
      camPos.set(0, 7, 52);
      camLook.set(0, 2, 5);
    } else if (SHOT === 'marina') {
      camPos.lerp(new THREE.Vector3(-138, 4.5, 92), 1 - Math.pow(0.001, dt));
      camLook.lerp(new THREE.Vector3(-152, 1.8, 92), 1 - Math.pow(0.001, dt));
    } else if (SHOT === 'title') {
      const t = performance.now() / 1000;
      camPos.set(70 + Math.sin(t * 0.05) * 10, 26, 110);
      camLook.set(-40, 6, -20);
    } else if (game.onFoot) {
      const p = heroPed.position;
      const back = new THREE.Vector3(Math.sin(game.heading + camYaw) * 6, 0, Math.cos(game.heading + camYaw) * 6);
      camPos.lerp(new THREE.Vector3(p.x + back.x, 3.2 + camPitch * 4, p.z + back.z), 1 - Math.pow(0.0001, dt));
      camLook.lerp(new THREE.Vector3(p.x, 1.5, p.z), 1 - Math.pow(0.0001, dt));
    } else {
      const h = cars.hero.position;
      const hx = Math.cos(game.heading), hz = -Math.sin(game.heading);
      const back = 10.5, up = 4.6 + camPitch * 3;
      const tx = h.x - hx * back + Math.sin(camYaw) * 6;
      const tz = h.z - hz * back;
      camPos.lerp(new THREE.Vector3(tx, up, tz), 1 - Math.pow(0.0005, dt));
      camLook.lerp(new THREE.Vector3(h.x + hx * 10, 1.8, h.z + hz * 10), 1 - Math.pow(0.0005, dt));
      camYaw *= Math.pow(0.2, dt);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // ---------- simulation ----------
  function speedKmh() { return Math.round(Math.abs(game.speed) * 3.6); }
  function updateCar(dt) {
    const top = CFG.topSpeed / 3.6;
    if (keys['KeyW'] || keys['ArrowUp']) game.speed += CFG.accel * dt;
    if (keys['KeyS'] || keys['ArrowDown']) game.speed -= (game.speed > 0.5 ? CFG.brake : CFG.accel * 0.6) * dt;
    game.speed -= game.speed * CFG.drag * dt;
    game.speed = Math.max(-8, Math.min(top, game.speed));
    const steer = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
    const handbrake = keys['Space'];
    const grip = handbrake ? 0.35 : 1;
    const spd = Math.abs(game.speed);
    if (steer !== 0 && spd > 0.5) {
      game.heading += steer * CFG.steerRate * dt * Math.min(1, spd / 12) * (game.speed < 0 ? -1 : 1) * (handbrake ? 1.6 : 1);
    }
    game.drift = handbrake && steer !== 0 && spd > 10;
    if (game.drift && Math.random() < dt * 0.5) showPopup('DRIFT x3', 'NEAR MISS +$250');
    const fx = Math.cos(game.heading), fz = -Math.sin(game.heading);
    // off-road drag: inside a block (not on a road) the car bogs down
    const offRoad = (Math.abs(cars.hero.position.x % 44) > 7.5 || Math.abs(cars.hero.position.x % 44) < 0)
      && Math.abs(((cars.hero.position.x % 44) + 44) % 44 - 22) > 4
      && Math.abs(((cars.hero.position.z % 44) + 44) % 44 - 22) > 4;
    const eff = offRoad ? 0.35 : 1;
    cars.hero.position.x += fx * game.speed * dt * eff;
    cars.hero.position.z += fz * game.speed * dt * eff;
    cars.hero.position.x = Math.max(-195, Math.min(195, cars.hero.position.x));
    cars.hero.position.z = Math.max(-195, Math.min(195, cars.hero.position.z));
    cars.hero.rotation.y = game.heading;
    // wheels: spin + front steer
    const w = cars.hero.userData.wheels;
    const spin = (game.speed * dt) / 0.47;
    for (const k of ['fl', 'fr', 'rl', 'rr']) w[k].rotation.x += spin;
    w.fl.rotation.y = w.fr.rotation.y = steer * 0.35 * grip;
    // body lean
    cars.hero.rotation.z = steer * Math.min(0.06, spd * 0.002) * (game.speed < 0 ? -1 : 1);
    // near-miss: passing a cruiser/traffic car closely at speed
    if (spd > 15) {
      for (const c of cars.cruisers) {
        const d = Math.hypot(c.position.x - cars.hero.position.x, c.position.z - cars.hero.position.z);
        if (d < 4.5 && Math.random() < dt * 0.8) {
          game.money += 250;
          $('money').textContent = fmt$(game.money);
          showPopup('NEAR MISS +$250', 'That was close, Torch');
        }
      }
    }
  }
  function updateOnFoot(dt) {
    const mv = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
    const st = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    const run = keys['ShiftLeft'] || keys['ShiftRight'];
    const sp = (run ? 8 : 4.2) * dt;
    if (mv) {
      heroPed.position.x += Math.cos(game.heading) * mv * sp;
      heroPed.position.z += -Math.sin(game.heading) * mv * sp;
    }
    if (st) {
      heroPed.position.x += -Math.sin(game.heading) * st * sp;
      heroPed.position.z += -Math.cos(game.heading) * st * sp;
    }
    if (mv || st) {
      heroPed.rotation.y = game.heading;
      heroPed.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.06;
    } else heroPed.position.y = 0;
    heroPed.position.x = Math.max(-195, Math.min(195, heroPed.position.x));
    heroPed.position.z = Math.max(-195, Math.min(195, heroPed.position.z));
  }
  function updatePolice(dt) {
    const h = cars.hero.position;
    const form = [[-6, -14], [7, -18], [-9, 2], [9, 6]];
    cars.cruisers.forEach((c, i) => {
      const tx = h.x + form[i][0], tz = h.z + form[i][1];
      const dx = tx - c.position.x, dz = tz - c.position.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(-dz, dx);
      let dh = want - c.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.rotation.y += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
      const sp = Math.min(26, 6 + dist * 0.9);
      c.position.x += Math.cos(c.rotation.y) * sp * dt;
      c.position.z += -Math.sin(c.rotation.y) * sp * dt;
      const w = c.userData.wheels;
      for (const k of ['fl', 'fr', 'rl', 'rr']) w[k].rotation.x += (sp * dt) / 0.47;
      // light bar flash
      const ph = Math.sin(performance.now() / 110 + i) > 0;
      if (c.userData.lightDomes) {
        c.userData.lightDomes.red.material.emissiveIntensity = ph ? 2.6 : 0.2;
        c.userData.lightDomes.blue.material.emissiveIntensity = ph ? 0.2 : 2.6;
      }
    });
    // heli follows above + ahead of the hero; beam tracks the hero
    const hx = h.x + 8, hz = h.z - 12;
    heli.position.x += (hx - heli.position.x) * Math.min(1, dt * 1.2);
    heli.position.z += (hz - heli.position.z) * Math.min(1, dt * 1.2);
    heli.position.y = 27 + Math.sin(performance.now() / 900) * 0.8;
    heli.userData.rotor.rotation.y += dt * 22;
    heli.userData.tailRotor.rotation.x += dt * 30;
    pool.position.x += (h.x - pool.position.x) * Math.min(1, dt * 2);
    pool.position.z += (h.z - pool.position.z) * Math.min(1, dt * 2);
    pool.material.opacity = 0.75 + Math.sin(performance.now() / 300) * 0.1;
  }
  function updateTraffic(dt) {
    for (const t of traffic) {
      const a = t.loop[t.seg], b = t.loop[(t.seg + 1) % t.loop.length];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      t.t += (t.speed * dt) / len;
      if (t.t >= 1) { t.t = 0; t.seg = (t.seg + 1) % t.loop.length; }
      const x = a[0] + dx * t.t + 3.5, z = a[1] + dz * t.t + 3.5;
      t.car.position.set(x, 0, z);
      const want = Math.atan2(-dz, dx);
      let dh = want - t.car.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      t.car.rotation.y += Math.max(-1.2 * dt, Math.min(1.2 * dt, dh));
      const w = t.car.userData.wheels;
      for (const k of ['fl', 'fr', 'rl', 'rr']) w[k].rotation.x += (t.speed * dt) / 0.47;
    }
  }
  function updatePeds(dt) {
    const t = performance.now() / 1000;
    for (const p of peds.list) {
      if (p.panic) {
        // panicking peds run away from the road, arms up
        p.g.position.x += (p.x0 < 0 ? -1 : 1) * dt * 2.2;
        p.g.position.y = Math.abs(Math.sin(t * 9 + p.phase)) * 0.08;
        p.g.rotation.y = p.x0 < 0 ? Math.PI : 0;
        if (Math.abs(p.g.position.x) > 40) p.g.position.x = p.x0;
      } else {
        const off = Math.sin(t * 0.25 + p.phase) * 14;
        p.g.position.x = p.x0 + off * 0.4;
        p.g.position.z = p.z0 + off;
        p.g.position.y = Math.abs(Math.sin(t * 5 + p.phase)) * 0.05;
        p.g.rotation.y = Math.cos(t * 0.25 + p.phase) > 0 ? 0 : Math.PI;
      }
    }
  }
  function updateMission(dt) {
    if (game.started && !FROZEN) {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      const m = String(Math.floor(game.timeLeft / 60)).padStart(2, '0');
      const s = String(Math.floor(game.timeLeft % 60)).padStart(2, '0');
      $('mission-time').textContent = m + ':' + s;
    }
    const target = stages[stageIdx] && stages[stageIdx].at;
    if (target && game.started) {
      const d = Math.hypot(cars.hero.position.x - target[0], cars.hero.position.z - target[1]);
      if (d < 9) {
        stages[stageIdx].done = true;
        stageIdx = Math.min(3, stageIdx + 1);
        game.money += 1500;
        $('money').textContent = fmt$(game.money);
        $('mission-stage').textContent = 'STAGE ' + (stageIdx + 1) + '/4';
        showPopup('STAGE COMPLETE', '+$1,500 · Next: ' + stages[stageIdx].name);
        SB.Audio.jingle();
        const nt = stages[stageIdx].at;
        if (nt) beacon.position.set(nt[0], 15, nt[1]);
        buildPauseMenu();
      }
    }
    if (popupTimer > 0) {
      popupTimer -= dt;
      if (popupTimer <= 0) $('popup').style.opacity = FROZEN ? '1' : '0';
    }
  }

  // ---------- staged shot states ----------
  function applyShot() {
    if (SHOT === 'chase') {
      // frozen chase: hero mid-drift at 108 km/h, full HUD, no title
      $('title-screen').style.display = 'none';
      $('speed').textContent = '108';
      game.started = true;
      camPos.set(0, 6.5, 50);
      camLook.set(0, 2, 0);
    } else if (SHOT === 'title') {
      $('title-screen').style.display = 'flex';
    } else if (SHOT === 'map') {
      $('title-screen').style.display = 'none';
      game.started = true;
      game.paused = true;
      $('pause-menu').style.display = 'flex';
      drawBigMap();
    } else if (SHOT === 'marina') {
      $('title-screen').style.display = 'none';
      game.started = true;
      $('speed').textContent = '0';
      camPos.set(-138, 4.5, 92);
      camLook.set(-152, 1.8, 92);
    }
  }

  // ---------- main loop ----------
  let last = performance.now();
  let miniTimer = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const running = game.started && !game.paused && !FROZEN;
    if (running) {
      if (game.onFoot) updateOnFoot(dt); else updateCar(dt);
      updatePolice(dt);
      updateTraffic(dt);
      updatePeds(dt);
      updateMission(dt);
      // dispatch distances drift with the chase
      document.querySelectorAll('.d-dist').forEach((el, i) => {
        const c = cars.cruisers[i % 4];
        const d = Math.round(Math.hypot(c.position.x - cars.hero.position.x, c.position.z - cars.hero.position.z));
        el.textContent = d + ' m';
      });
      $('speed').textContent = game.onFoot ? '0' : String(speedKmh());
      SB.Audio.setEngine(speedKmh(), !game.onFoot);
      locate();
      miniTimer += dt;
      if (miniTimer > 0.12) { miniTimer = 0; drawMinimap(); }
    }
    // sun shadow follows the hero
    sun.target.position.copy(cars.hero.position);
    sun.position.set(cars.hero.position.x - 90, 70, cars.hero.position.z + 50);
    updateCamera(dt);
    renderer.render(scene, camera);
    if (!game.ready) { game.ready = true; }
  }

  // ---------- boot ----------
  buildHUD();
  drawMinimap();
  applyShot();
  if (SHOT === 'chase' || SHOT === 'marina') {
    // staged stills: draw the HUD once, then freeze the sim
    drawMinimap();
  }
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  cars.speedKmh = speedKmh;
  SB.game = game;
  SB.cars = cars;
  SB.police = police;
  SB.peds = peds;
  requestAnimationFrame(loop);
})();
