// Staged shots (?shot=chase|title|map|marina): fixed camera + scene setups
// for the four screenshots. Each one shows a different system at its best.
import { SHOT_SPEED_KMH } from './config.js';
import { setSpeed, showPopup, hidePopup, drawBigMap } from './hud.js';

export function stageChase(g) {
  // Hero at a drift angle, BIG in frame; camera close, low, 3/4 rear,
  // aimed slightly up so the helicopter stays in the frame. Staged off
  // the crosswalk so no giant stripes fill the foreground.
  g.hero.position.set(-20, 0, 0);
  g.hero.rotation.y = -0.45;
  g.camera.position.set(-27, 3.3, 7.0);
  g.camera.lookAt(-13.5, 3.0, -1.5);
  g.followCam = false;
  setSpeed(SHOT_SPEED_KMH);
  showPopup('<div class="pop-big">DRIFT x3</div><div class="pop-sub">NEAR MISS +$250</div>');
  g.state.mode = 'drive';
}

export function stageTitle(g) {
  // Street-level view down Ember Boulevard: city, traffic, heli overhead.
  g.hero.position.set(-6, 0, 2.5);
  g.hero.rotation.y = 0.1;
  g.camera.position.set(-34, 4.2, 9);
  g.camera.lookAt(25, 2.5, -1);
  g.followCam = false;
  hidePopup();
  g.state.mode = 'title';
  document.getElementById('title-screen').style.display = 'flex';
  document.getElementById('dialog').style.display = 'none';
  document.getElementById('controls-hint').style.display = 'none';
}

export function stageMap(g) {
  // Pause menu open over the chase; the big map is drawn by main.
  stageChase(g);
  g.state.mode = 'pause';
  document.getElementById('pause-menu').style.display = 'flex';
  drawBigMap(document.getElementById('bigmap').getContext('2d'), g.hero.position);
  hidePopup();
}

export function stageMarina(g) {
  // Camera CLOSE on the dock crew — faces must be readable. Warm frontal
  // fill light so nobody is a silhouette.
  g.hero.position.set(38, 0, -18);
  g.hero.rotation.y = 0.5;
  g.camera.position.set(46.4, 1.55, -26.8);
  g.camera.lookAt(46.4, 1.3, -31.2);
  g.followCam = false;
  setSpeed(0);
  hidePopup();
  g.state.mode = 'drive';
  if (g.marinaFill) {
    g.marinaFill.position.set(46.4, 3, -23);
    g.marinaFill.target.position.set(46.4, 1.2, -31);
    g.marinaFill.intensity = 260;
  }
}
