// Screenshot setups (?shot=...) and the built-in 20-check playtest
// (?playtest=1). Results land on window.__playtest for the headless runner.

export function applyShot(game) {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return;
  if (shot === 'chase') {
    game.startGame();
    game.autoDrive = true;
    game.physics.state.speed = 19; // rolling shot: wheels turning, HUD live
  } else if (shot === 'map') {
    game.startGame();
    game.hud.openMap();
  } else if (shot === 'marina') {
    game.startGame();
    // From the water south of the south pier, looking north: the three
    // crew stand on the pier 12 m ahead facing the camera, and the moored
    // boats beyond them show their full coloured hulls side-on, with the
    // far pier and the beach behind. Boats run east-west, so the camera
    // must sit north or south of them — never east or west.
    game.setCarPose(306, 200, Math.PI / 2);
    const crewSpots = [[342, 230], [350, 230], [358, 230]];
    game.world.marina.crew.forEach((c, i) => {
      c.group.position.set(crewSpots[i][0], 0.7, crewSpots[i][1]);
      c.baseY = 0.7;
      c.group.rotation.y = Math.PI;
    });
    game.cinematic = {
      pos: new THREE.Vector3(350, 3, 242),
      lookAt: new THREE.Vector3(350, 1, 195),
    };
  }
  // shot=title needs nothing: the title screen is the default state.
}

function check(name, pass, detail) {
  return { name, pass: !!pass, detail: detail || '' };
}

export async function runPlaytest(game) {
  const results = [];
  const t0 = performance.now();

  // Wait until at least 3 frames have rendered (or 20 s, headless can be slow).
  while (game.frame < 3 && performance.now() - t0 < 20000) {
    await new Promise((r) => setTimeout(r, 200));
  }

  const scene = game.render.scene;
  const findMesh = (pred) => {
    let found = null;
    scene.traverse((o) => {
      if (!found && o.isMesh && pred(o)) found = o;
    });
    return found;
  };

  results.push(
    check(
      'three.js loaded',
      typeof THREE !== 'undefined' && !!THREE.WebGLRenderer,
      `rev ${THREE.REVISION || '?'}`,
    ),
  );
  results.push(
    check('WebGL context created', !!game.render.renderer.getContext(), 'webgl2'),
  );
  results.push(check('frames rendering', game.frame >= 3, `${game.frame} frames`));
  results.push(
    check('city built', game.world.counts.buildings >= 40, `${game.world.counts.buildings} buildings`),
  );

  // Hero car: 4 spoked wheels + the emissive full-width taillight bar.
  let tailFound = false;
  game.hero.group.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive && o.material.emissive.getHex() === 0xff1a1a) {
      tailFound = true;
    }
  });
  results.push(
    check(
      'hero car built',
      game.hero.wheels.length === 4 && tailFound,
      '4 spoked wheels, taillight bar lit',
    ),
  );

  const sun = game.render.sun;
  const heroNear =
    game.render.heroLight.position.distanceTo(game.physics.state.pos) < 24;
  results.push(
    check(
      'lighting rig: sun SW + hero light on car',
      sun.position.x < 0 && sun.position.z > 0 && heroNear,
      `sun (${Math.round(sun.position.x)}, ${Math.round(sun.position.z)})`,
    ),
  );
  const sky = findMesh((o) => o.material && o.material.uniforms && o.material.uniforms.sunPosition);
  results.push(
    check('sky + golden fog', !!sky && !!scene.fog, sky ? 'Sky addon' : 'no sky'),
  );
  const ocean = findMesh(
    (o) => o.material && o.material.color && o.material.color.getHex() === 0x2e7f9e,
  );
  results.push(check('ocean present', !!ocean, ocean ? 'east shore' : 'missing'));

  let wedge = false;
  for (const b of game.world.marina.boats) {
    b.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.type === 'ConeGeometry') wedge = true;
    });
  }
  results.push(
    check(
      'marina: boats without wedge hulls',
      game.world.marina.boats.length >= 5 && !wedge,
      `${game.world.marina.boats.length} boats, wedge=${wedge}`,
    ),
  );
  results.push(
    check('marina crew visible', game.world.marina.crew.length === 3, '3 crew on the docks'),
  );
  results.push(
    check('pedestrians walking', game.peds.peds.length >= 10, `${game.peds.peds.length} peds`),
  );
  results.push(
    check('traffic on the roads', game.traffic.cars.length >= 8, `${game.traffic.cars.length} cars`),
  );
  const hudOk =
    document.getElementById('hud-speed') &&
    document.getElementById('minimap') &&
    document.getElementById('hud-stars');
  results.push(check('HUD + minimap present', !!hudOk, '4-corner HUD'));
  game.hud.openMap();
  const mapOpened = document.getElementById('map-overlay').classList.contains('show');
  game.hud.closeMap();
  results.push(check('big map opens (M)', mapOpened, 'districts + GPS route'));

  // Drive test on the real physics: start the game (chase camera on), then
  // 20 synthetic steps, then reset.
  game.startGame();
  const p0 = game.physics.state.pos.clone();
  for (let i = 0; i < 20; i++) {
    game.physics.update(0.05, { throttle: 1, steer: 0, handbrake: false }, game.world.colliders);
  }
  const moved = game.physics.state.pos.distanceTo(p0);
  const drove = game.physics.state.speed > 5 && moved > 2;
  results.push(
    check('car drives', drove, `speed ${game.physics.state.speed.toFixed(1)} m/s, moved ${moved.toFixed(1)} m`),
  );
  const camBefore = game.render.camera.position.clone();
  for (let i = 0; i < 8; i++) game.updateCamera(0.1);
  const camMoved = game.render.camera.position.distanceTo(camBefore);
  const camNear = game.render.camera.position.distanceTo(game.physics.state.pos);
  results.push(
    check('chase camera follows', camMoved > 0.5 && camNear < 26, `camera ${camNear.toFixed(1)} m behind car`),
  );

  results.push(
    check(
      'checkpoints live',
      game.missions.checkpoints.length === 6 && game.missions.nextCheckpoint,
      '6-ring Sunset Sprint',
    ),
  );

  // Drift test: speed up, then power-slide (throttle + handbrake + steer)
  // and watch the score.
  game.setCarPose(235, 60, Math.PI);
  game.physics.state.speed = 26;
  for (let i = 0; i < 14; i++) {
    game.physics.update(0.05, { throttle: 1, steer: 1, handbrake: true }, game.world.colliders);
  }
  const wasDrift = game.physics.state.drifting;
  game.missions.update(0.5, game.physics.state.pos, 26, true, 0.4, 10);
  const driftScore = game.missions.driftPoints > 0;
  results.push(
    check('drift scoring works', wasDrift || driftScore, `drifting=${wasDrift}, points=${game.missions.driftPoints}`),
  );
  game.setCarPose(235, 60, Math.PI);
  game.missions.reset();

  const saveOk = (() => {
    try {
      game.saveRoundtrip();
      return true;
    } catch {
      return false;
    }
  })();
  results.push(check('save/load roundtrip', saveOk, 'localStorage'));

  results.push(
    check('zero console errors', game.errors.length === 0, game.errors.slice(0, 2).join(' | ')),
  );

  const passed = results.filter((r) => r.pass).length;
  window.__playtest = { passed, total: results.length, results };
  return window.__playtest;
}
