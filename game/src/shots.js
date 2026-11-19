// Screenshot staging: ?shot=chase|title|map|marina. Each shot sets the real
// game state (mode, chapter, wanted, car and camera poses) and freezes the
// world so the captured frame is deterministic. The camera SNAPS (k=1) in
// shotFrozen mode — headless capture renders few frames, so no lerping.
import { CHAPTERS } from './config.js';
import { setDialogue, showNearMiss } from './hud.js';
import { drawCityMap } from './map.js';

export const SHOT_NAMES = ['chase', 'title', 'map', 'marina'];

export function stageShot(name, game) {
  const g = game;
  g.shotFrozen = true;
  g.state.clock = '18:47';
  if (name === 'title') {
    g.setMode('title');
    // Hero car right-of-center, clear of the START ENGINE button.
    g.heroCar.setPose(5.5, 5.5, -0.6);
    g.state.inCar = true;
    g.state.displaySpeedKmh = 0;
    g.camera.position.set(-5, 2.4, 13);
    g.camera.lookAt(1.5, 1.2, -4);
    g.titleCamera = g.camera.position.clone();
    g.titleLookAt = new g.THREE.Vector3(1.5, 1.2, -4);
    return;
  }
  if (name === 'map') {
    g.setMode('play');
    g.state.chapter = 1;
    g.state.stage = 1;
    g.heroCar.setPose(0, 10, Math.PI);
    g.state.inCar = true;
    g.setWanted(0);
    g.openMap();
    // Draw the map now so the capture shows it fully rendered.
    const canvas = document.getElementById('citymap');
    if (canvas) drawCityMap(canvas, g);
    return;
  }
  if (name === 'marina') {
    g.setMode('play');
    g.state.chapter = 2;
    g.state.stage = 0;
    g.state.inCar = false;
    g.setWanted(0);
    // Rico on the quay facing the docks, crew around him.
    g.rico.position.set(68, 0, 8);
    g.rico.rotation.y = Math.PI / 2;
    g.rico.visible = true;
    g.heroCar.group.visible = false;
    g.setDialogue('rosa', CHAPTERS[1].line);
    g.footCamTarget = g.rico.position.clone();
    // Foot camera: back 5, height 3.0, snapped — Rico fills more of the frame.
    g.camera.position.set(63, 3.0, 8);
    g.camera.lookAt(72, 1.4, 8);
    g.police.parkHeli();
    return;
  }
  // Default: chase — the cover.
  g.setMode('play');
  g.state.chapter = 1;
  g.state.stage = 1;
  g.state.inCar = true;
  g.setWanted(3);
  g.heroCar.setPose(0, 18, Math.PI);
  g.heroCar.speed = 0;
  g.state.displaySpeedKmh = 167;
  g.state.gear = 6;
  // Two police units ahead of the hero, light bars on.
  g.police.units[0].setPose(-3.5, -20, Math.PI);
  g.police.units[1].setPose(3.5, -36, Math.PI);
  g.police.units[2].setPose(-3.5, 60, 0);
  g.police.parkHeli();
  setDialogue('lena', CHAPTERS[0].line);
  showNearMiss(true);
  // Chase camera snaps into place on the first frame (k=1 in shotFrozen).
  g.snapChaseCamera();
}
