// Screenshot modes: frozen, composed scenes for the 4 dossier screenshots.
// In shot mode the camera SNAPS to its target (no lerp — headless capture
// renders only a few frames, so a lerp never converges).

export const SHOT_NAMES = ['chase', 'title', 'map', 'marina'];

function snapCamera(game, x, y, z, lx, ly, lz) {
  game.shotCamera = {
    pos: new THREE.Vector3(x, y, z),
    look: new THREE.Vector3(lx, ly, lz),
  };
  game.camera.position.copy(game.shotCamera.pos);
  game.camera.lookAt(game.shotCamera.look);
}

function holdFloat(hud, text, color) {
  hud.showFloat(text, color);
  const el = hud.el['float-text'];
  if (el) {
    el.style.animation = 'none';
    el.style.opacity = '1';
  }
}

export function setupShot(name, game) {
  const { hud, missions, police, hero, rico, traffic, state } = game;
  hud.hideTitle();
  hud.closeMap();

  if (name === 'chase') {
    // COVER: bright neon chase, 2 police cars ahead, dense HUD, NEAR MISS.
    state.inCar = true;
    state.money = 42780;
    state.respect = 320;
    state.condition = 95;
    state.day = 1;
    state.minutes = 22 * 60 + 47;
    missions.jobIndex = 0;
    missions.stageIndex = 1;
    missions.stageTimer = 0;
    missions.latched = 0;
    hero.setPose(0, 0, 0);
    hero.speed = 0; // parked for the frozen frame — the speedo shows the override
    state.displaySpeedKmh = 167;
    police.setWanted(3);
    // place BOTH pursuit units at real spots immediately (never at origin)
    if (police.pursuit[0]) {
      police.pursuit[0].setPose(4.2, -14, 0);
      police.pursuit[0].group.visible = true;
      police.pursuit[0].freezeBlink();
    }
    if (police.pursuit[1]) {
      police.pursuit[1].setPose(-2.2, -26, 0);
      police.pursuit[1].group.visible = true;
      police.pursuit[1].freezeBlink();
    }
    // traffic depth: one car far ahead, one in the next lane
    if (traffic.cars[0]) traffic.cars[0].setPose(1.8, -55, 0);
    if (traffic.cars[1]) traffic.cars[1].setPose(-5.0, -44, 0);
    // helicopter visible in the sky, searchlight on the player
    if (police.heli) {
      police.heli.group.position.set(18, 30, -30);
      police.heli.group.lookAt(0, 0, -10);
    }
    snapCamera(game, 2.4, 2.6, 6.8, -0.5, 1.2, -6);
    hud.showDialogue('lena', 'Two units on your tail, Rico — lose them on Palm Row!', 999);
    holdFloat(hud, 'NEAR MISS +$250', '#ffd23f');
  } else if (name === 'title') {
    state.inCar = true;
    hero.setPose(-4.5, 3, -0.6);
    hero.speed = 0;
    police.setWanted(0);
    snapCamera(game, 6.2, 2.0, 11, -1, 0.9, 1.5);
    // clean title shot: no HUD, no dialogue behind the title screen
    if (hud.el.hud) hud.el.hud.style.display = 'none';
    hud.showTitle(false);
  } else if (name === 'map') {
    // AAA city map overlay with the GPS route (mission stage 1: garage).
    state.inCar = true;
    state.money = 42780;
    missions.jobIndex = 0;
    missions.stageIndex = 1;
    hero.setPose(0, 0, 0);
    hero.speed = 0;
    police.setWanted(2);
    if (police.pursuit[0]) {
      police.pursuit[0].setPose(3.4, -24, 0);
      police.pursuit[0].group.visible = true;
      police.pursuit[0].freezeBlink();
    }
    snapCamera(game, 1.4, 2.6, 6.8, 0, 1.2, -6);
    // the map overlay is drawn from live HUD state (see main.js)
    game.openMapNextFrame = true;
  } else if (name === 'marina') {
    // On foot at the quay: Rico centre-frame, crew with umbrellas, boats, docks.
    state.inCar = false;
    state.money = 43980;
    // job 1 stage 1 (enter-car) cannot auto-complete on foot, so the panel
    // stays coherent; clear the queued dialogue so the Rosa line below stays.
    missions.jobIndex = 0;
    missions.stageIndex = 0;
    missions.dialogue = [];
    rico.group.position.set(56, 0.8, -18);
    rico.group.rotation.y = -Math.PI / 2; // face the docks (+X)
    hero.setPose(51, -26, 0.15);
    hero.speed = 0;
    police.setWanted(0);
    snapCamera(game, 50, 2.6, -10, 56, 1.3, -18);
    hud.showDialogue('rosa', 'Tonight the city learns our name, Rico. Drive it home.', 999);
  }

  game.shotMode = name;
  // freeze almost immediately: the hero must not drive away from the snapped
  // camera, and the HUD only needs a frame or two to populate.
  game.freezeAfterFrames = 2;
  return true;
}
