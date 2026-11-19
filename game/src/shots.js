// Screenshot staging for SOLMAR BAY. Each shot is triggered by ?shot=<name>
// and stages the game into a frozen, composed frame, then the runner captures
// it. Headless capture renders few frames, so the camera SNAPS (k=1) in
// shot-frozen mode instead of lerping.
//
//   chase  — cover: big hero rear-3/4 + TWO police + dense HUD + NEAR MISS
//   title  — title screen, hero clearly visible right-of-center
//   map    — AAA city map overlay with GPS route
//   marina — Rico on foot at the quay, Mama Rosa dialogue, zero artifacts
import { placeCar } from './cars.js';

export const SHOT_NAMES = ['chase', 'title', 'map', 'marina'];

export function stageShot(game, name) {
  if (!SHOT_NAMES.includes(name)) return { ok: false, detail: 'unknown shot ' + name };
  game.shotName = name;
  game.frozen = true; // frozen frame: nothing moves during capture

  if (name === 'chase') {
    game.setMode('drive');
    game.hideTitleScreen();
    game.hud.hideMap();
    // Hero on the avenue, rear-3/4 to the camera.
    game.setPlayerPos(0, 20, 0, true);
    game.displaySpeedKmh = 167; // override with the car still (V8 fix)
    game.gear = 6;
    // TWO police clearly ahead and close enough to read.
    game.police.setWanted(3);
    const units = game.police.units;
    if (units[0]) placeCar(units[0].group, -3.2, 32, 0);
    if (units[1]) placeCar(units[1].group, 3.8, 39, 0);
    game.starBlink = 0.75; // WANTED blink 0.75 at capture (V7 fix)
    // Cover framing: closer + wider side offset so the hero's SIDE shows
    // (V10 fix d) — the rear alone reads as a flat slab.
    game.cameraRig = { back: 5.5, side: 2.6, height: 2.2, lookAhead: 6 };
    game.snapCamera(); // k=1 snap (V7 fix)
    game.hud.holdActionText('NEAR MISS +$250'); // pinned: the 2.6 s animation would end before capture
    game.hud.showDialogue('Lena "Wrench" Ortiz', 'Two units on your tail, Rico — lose them on Palm Row!', 30000);
    game.jobs.setJob(0, 1);
    game.setTarget({ x: -60, z: 95 });
    game.hud.update(game.hudState());
    return { ok: true, detail: 'chase staged' };
  }

  if (name === 'title') {
    game.setMode('title');
    game.showTitleScreen();
    game.hud.hideMap();
    // Hero parked right-of-center (V10 fix b): far enough right and close
    // enough to the camera to clear the START ENGINE button entirely.
    game.setPlayerPos(6.5, 38, 0.5, true);
    game.police.setWanted(0);
    game.cameraRig = { back: 0, side: 0, height: 0, lookAhead: 0 };
    game.camera.position.set(-2, 2.6, 48);
    game.camera.lookAt(0, 1.2, 28);
    game.hud.update(game.hudState());
    return { ok: true, detail: 'title staged' };
  }

  if (name === 'map') {
    game.setMode('map');
    game.hideTitleScreen();
    game.jobs.setJob(0, 1); // stage 1: GPS route active
    game.setPlayerPos(0, 20, 0, true);
    game.setTarget({ x: -60, z: 95 });
    game.police.setWanted(3);
    game.hud.showMap();
    game.hud.update(game.hudState()); // hud.update runs in map mode (V7 fix)
    return { ok: true, detail: 'map staged' };
  }

  // marina
  game.setMode('foot');
  game.hideTitleScreen();
  game.hud.hideMap();
  game.jobs.setJob(0, 0); // stage: enter-car (V8 fix)
  game.hud.clearDialogue(); // dialogue queue cleared (V8 fix)
  // Rico on the clear quay, facing the docks (+X).
  game.setPlayerPos(45, 40, Math.PI / 2, false);
  game.police.setWanted(0); // clean: freezing must not create a phantom star
  game.starBlink = 1;
  // Foot cam: back 7.5, height 3.6 in shot mode (V7 fix).
  game.camera.position.set(37.5, 3.6, 40);
  game.camera.lookAt(49, 1.2, 40);
  // Crew nearby on the quay.
  game.placeCrew(42, 36, 48, 44);
  game.hud.showDialogue('Mama Rosa', 'Tonight the city learns our name, Rico. Drive it home.', 30000);
  game.hud.update(game.hudState());
  return { ok: true, detail: 'marina staged' };
}
