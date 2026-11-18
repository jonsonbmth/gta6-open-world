// Screenshot staging: ?shot=<name>&seed=1 sets a deterministic staged scene
// using the game's own systems (camera, HUD, police, dialogue). No compositing.
import { currentJob } from './missions.js';

export function shotParam() {
  const q = new URLSearchParams(window.location.search);
  return q.get('shot') || null;
}

export function seedParam() {
  const q = new URLSearchParams(window.location.search);
  const s = parseInt(q.get('seed') || '1', 10);
  return Number.isFinite(s) ? s : 1;
}

// Stage the cover: hero mid-chase on Lumen Avenue, 3 stars, NEAR MISS up,
// dialogue showing, 2 cruisers ahead. Motion is FROZEN for the still shot
// (the render is slow in headless, so a moving hero would outrun the camera)
// and the camera is SNAPPED to a low, close rear-3/4 position.
export function stageChase(game) {
  const { state, police } = game;
  state.wanted = 3;
  state.jobIndex = 0;
  state.jobStage = 0;
  state.speedKmh = 167;
  state.money = 42780;
  state.clockMinutes = 22 * 60 + 46;
  game.hero.position.set(2.5, 0, 60);
  game.hero.rotation.y = Math.PI; // facing -Z (north, toward downtown)
  game.heroHeading = Math.PI;
  game.heroSpeed = 46; // m/s ~ 167 km/h (shown on the speedo)
  game.inCar = true;
  game.frozen = true;
  game.setDialogue('lena', currentJob(state).lines[0]);
  police.stageCover(game.hero.position);
  game.showFloaterStatic('NEAR MISS +$250');
  game.camMode = 'chase';
  // camera: LOW, CLOSE, rear 3/4 from the right — hero fills ~30% of frame,
  // whole car in frame with the chase ahead visible
  game.camOffset.set(2.8, 2.0, 6.2);
  game.snapCamera();
  return true;
}

// Title screen: keep the title overlay up, camera drifting down the avenue.
export function stageTitle(game) {
  game.hero.position.set(0, 0, 120);
  game.hero.rotation.y = Math.PI;
  game.camMode = 'title';
  game.camOffset.set(6.5, 3.4, 14);
  return true;
}

// City map: open the map overlay.
export function stageMap(game) {
  game.openMap();
  return true;
}

// Marina on foot: Rico at the Old Harbour docks FACING THE WATER (boats,
// lamps, crates ahead), Dario dialogue, pedestrians. Frozen + snapped camera.
export function stageMarina(game) {
  const { state } = game;
  state.jobIndex = 1;
  state.jobStage = 0;
  state.wanted = 0;
  state.onFoot = true;
  state.speedKmh = 0;
  game.inCar = false;
  game.frozen = true;
  game.rico.position.set(-2, 0, 168);
  game.rico.rotation.y = 0.1; // facing +Z: the water, docks and boats
  game.rico.visible = true;
  game.setDialogue('dario', currentJob(state).lines[0]);
  game.camMode = 'foot';
  // camera to Rico's right so he lands left-of-centre, clear of the dialogue panel
  game.camOffset.set(5.8, 2.7, 8.2);
  game.snapCamera();
  return true;
}

export const STAGES = {
  chase: stageChase,
  title: stageTitle,
  map: stageMap,
  marina: stageMarina,
};
