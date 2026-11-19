// SOLMAR BAY — screenshot staging (?shot=chase|title|map|marina).
// Each shot sets up the game synchronously at boot, then freezes the sim
// (shotFrozen) so a slow headless capture still gets the composed frame.
// The camera SNAPS (k=1) in shotFrozen mode — no lerp, no drift.
import { CHASE } from './config.js';

export function applyShot(game, name) {
  const g = game;
  if (name === 'chase') {
    g.startGame();
    // Stage 1: "Drive to the garage on Palm Row" — the "Two units on your
    // tail" line is the cover dialogue, and the GPS route is live.
    g.missions.stage = 1;
    // Hero car on the avenue, driving north (+Z), mid-block.
    g.enterCarAt(CHASE.heroStart.x, CHASE.heroStart.z, 0);
    g.speedKmh = CHASE.speedKmh;
    g.displaySpeedKmh = CHASE.speedKmh;
    g.gear = 6;
    g.setDrivingSpeed(CHASE.speedKmh / 3.6);
    // Two police cars ahead, clearly readable.
    g.police.placeUnits(CHASE.policeAhead);
    g.police.setWanted(3);
    // Pinned action text + Lena dialogue.
    g.hud.pinAction('NEAR MISS +$250');
    const d = g.missions.dialogue();
    g.hud.showDialogue('lena', 'Lena "Wrench" Ortiz', '#ff7ab0', d.line);
    // Chase camera: snap into place immediately.
    g.snapChaseCamera();
    g.shotFrozen = true;
    g.shotName = 'chase';
  } else if (name === 'title') {
    g.mode = 'title';
    // Hero car parked right-of-center, CLOSE and angled, clear of the button.
    // NOTE (right-handed coords): facing north (+z), +x appears LEFT and -x
    // appears RIGHT — so the car goes WEST of the lookAt point to read right.
    // Camera at z=12 sits between the z=0 and z=45 crosswalks (the z=0 one
    // filled the foreground when the camera was at z=4).
    g.enterCarAt(-5, 26, -0.4);
    g.speedKmh = 0;
    g.displaySpeedKmh = 0;
    // Title camera: low, looking north at the car + neon street + sunset.
    // The lookAt sits EAST of the car so the car lands well right of center
    // (clear of the START ENGINE button), and high (y=1.9) so the car sits
    // below the tagline text.
    g.camera.position.set(3, 2.6, 12);
    g.camera.lookAt(2, 1.9, 30);
    g.titleCamera = g.camera.position.clone();
    g.titleLookAt = new g.THREE.Vector3(2, 1.9, 30);
    g.shotFrozen = true;
    g.shotName = 'title';
  } else if (name === 'map') {
    g.startGame();
    g.enterCarAt(1.6, -12, 0);
    g.missions.chapter = 0;
    g.missions.stage = 1; // stage 1: GPS route to Palm Row
    g.hud.openMap();
    g.hud.update(0);
    g.shotFrozen = true;
    g.shotName = 'map';
  } else if (name === 'marina') {
    g.startGame();
    // Chapter 2, stage 0: "Meet the contact at the marina" — the marina job.
    g.missions.chapter = 1;
    g.missions.stage = 0;
    // Rico on foot at the marina quay, facing the boats (east).
    // Quay top is at y=0.47 — stand ON it, not inside it.
    g.exitCarAt(96, 8, Math.PI / 2);
    g.rico.group.position.y = 0.47;
    const d = g.missions.dialogue();
    g.hud.showDialogue('rosa', 'Mama Rosa', '#b08aff', 'Tonight the city learns our name, Rico. Drive it home.');
    // Foot camera: back 5.5, height 2.6 — Rico BIG in frame, boats behind.
    g.camera.position.set(96 - 5.5, 2.6, 8);
    g.camera.lookAt(114, 1.3, 8);
    g.marinaCamera = g.camera.position.clone();
    g.marinaLookAt = new g.THREE.Vector3(114, 1.3, 8);
    g.shotFrozen = true;
    g.shotName = 'marina';
  }
  return g.shotName;
}
