// SOLMAR BAY — deterministic screenshot presets (?shot=chase|title|map|marina).
// Each preset stages the exact composition the dossier shows: the chase cover
// puts TWO police cars in frame with the hero car big and close, the title
// shows the skyline, the map opens the AAA city map, the marina goes on foot
// with Rico and the crew. The physics is frozen; rain, strobes and the
// helicopter keep animating so the shot feels alive.
import * as THREE from 'three';

const NORTH = Math.PI; // heading north = -Z

function stageChase(g) {
  g.startPlaying();
  g.setMoney(42780);
  g.setTime(1, 22 * 60 + 47);
  g.setMission(0, 1); // CH 1, stage 2/3 — "Lose the cops"
  // Hero: low on Lumen Avenue, heading north, speedometer reading 167.
  g.setHero(2, 40, NORTH, 167);
  // TWO police cars, placed by hand so both are clearly in the frame:
  // UNIT 7 ahead-right, close; UNIT 12 ahead-left, mid-distance.
  g.police.setWanted(3); // 3 stars + AIR-1 helicopter
  const p1 = g.police.spawnPoliceCar(g.player.pos, NORTH);
  p1.car.position.set(6.5, 0, 24);
  p1.car.rotation.y = NORTH;
  p1.heading = NORTH;
  const p2 = g.police.spawnPoliceCar(g.player.pos, NORTH);
  p2.car.position.set(-5, 0, 27);
  p2.car.rotation.y = NORTH;
  p2.heading = NORTH;
  // Pin the helicopter up-left, farther away, so its searchlight shaft sits
  // at the frame's edge instead of tenting over the hero car.
  g.police.setHeliPos(-22, 26, -6);
  // Low, close rear-3/4 chase cam: hero fills ~30% of the frame.
  g.setFixedCamera(7.5, 2.8, 48.5, -1, 1.4, 20);
  // Dialogue + floating action text on screen.
  g.hud.showDialogue('lena', "Lena: Lose them on Lumen — cut through the marina if you have to!");
  g.hud.stickyFloat('NEAR MISS +$250', 'good');
  g.freezeShot();
}

function stageTitle(g) {
  g.setMoney(42780);
  g.setTime(1, 22 * 60 + 47);
  // Hero parked left-of-centre on the Strip, skyline behind, logo above.
  g.setHero(-7, 52, NORTH, 0);
  g.setFixedCamera(6, 3.2, 68, -3, 4, 25);
  g.freezeShot();
}

function stageMap(g) {
  g.startPlaying();
  g.setMoney(42780);
  g.setTime(1, 22 * 60 + 47);
  g.setMission(0, 0); // objective on Lumen Ave north — GPS route shows
  g.setHero(2, 40, NORTH, 0);
  g.setFixedCamera(7.5, 2.8, 48.5, -1, 1.4, 20);
  g.openMap();
  g.freezeShot();
}

function stageMarina(g) {
  g.startPlaying();
  g.setMoney(42780);
  g.setTime(1, 22 * 60 + 47);
  g.setMission(1, 0); // CH 2 — Pier 9 objective marker right here
  // Rico on foot on the harbour promenade, crew around him, pier + boats
  // + the objective beacon behind them.
  g.placeOnFoot(-198, 150, 2.2);
  g.placeCrew([
    ['lena', -195, 147, 2.0],
    ['dario', -201, 153, 2.4],
    ['rosa', -196, 153, 2.2],
  ]);
  g.setFixedCamera(-190, 2.2, 144, -198, 1.6, 150);
  g.hud.showDialogue('rosa', "Mama Rosa: The package is under the blue container, mijo. Quick and quiet.");
  g.freezeShot();
}

export function applyShot(name, gameAPI) {
  if (name === 'chase') stageChase(gameAPI);
  else if (name === 'title') stageTitle(gameAPI);
  else if (name === 'map') stageMap(gameAPI);
  else if (name === 'marina') stageMarina(gameAPI);
}
