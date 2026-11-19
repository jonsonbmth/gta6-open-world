// Screenshot staging: each shot plays the real game forward from a fresh world
// to a fixed, deterministic moment, then freezes the simulation so the frame the
// headless browser captures is exactly the staged one. The camera SNAPS (k=1) in
// frozen mode because headless capture renders few frames.
//
// Shots: chase (cover), title, map, marina — ?shot=chase|title|map|marina&seed=1.
export function stageShot(name, game) {
  const shot = ['chase', 'title', 'map', 'marina'].includes(name) ? name : 'chase';
  game.resetWorld();
  game.setFrozen(true);

  if (shot === 'chase') {
    // Cover: hero on Solmar Avenue heading north, lit from the camera side.
    game.setHero(0, 30, Math.PI);
    game.setDisplaySpeed(167);
    game.setWanted(3);
    game.setBlink(0.75);
    // Two police cars ahead, clearly visible, light bars + road pools.
    game.placePolice([
      { x: -3.2, z: 14, heading: Math.PI },
      { x: 3.4, z: 20, heading: Math.PI },
    ]);
    game.setMission(0, 1); // CH1 stage 1: GPS route to Crown Road
    // Keep the chase frame clean: no traffic near the hero or the camera, two
    // cars placed ahead in the distance for city life.
    game.clearTrafficNear(0, 30, 32);
    game.placeTrafficSpot(-3.6, -14, Math.PI);
    game.placeTrafficSpot(3.6, -40, Math.PI);
    game.setDialogue('Lena "Wrench" Ortiz', 'Two units on your tail, Rico — lose them on Palm Row!');
    game.setNearMiss(true);
    game.setMode('play');
    game.setCameraMode('chase');
    game.parkHeli();
    return { shot, mode: 'play' };
  }

  if (shot === 'title') {
    // Title: hero parked facing south-east so the camera sees the lit front 3/4,
    // right-of-center, clear of the START ENGINE button. No traffic near the
    // button: the street centre ahead of the camera stays empty.
    game.setHero(0, 30, Math.PI / 4);
    game.setWanted(0);
    game.clearTrafficNear(0, 30, 40);
    game.setMode('title');
    game.setCameraMode('title');
    return { shot, mode: 'title' };
  }

  if (shot === 'map') {
    // Map: the AAA city map overlay over the frozen chase view. Stage 1 so the
    // GPS route draws; hud.update keeps running in map mode.
    game.setHero(0, 30, Math.PI);
    game.setWanted(0);
    game.setMission(0, 1);
    game.setMode('map');
    game.setCameraMode('chase');
    return { shot, mode: 'map' };
  }

  // Marina: Rico on foot at the quay, crew around him, boats on the water.
  game.setPlayerOnFoot(92, 24, Math.PI / 2);
  game.setWanted(0);
  game.clearDialogue();
  game.setMission(1, 1); // CH2 stage 1: enter-car at the marina
  game.setDialogue('Mama Rosa', 'Tonight the city learns our name, Rico. Drive it home.');
  game.placeCrew([
    { who: 'lena', x: 95, z: 18, heading: Math.PI / 2 },
    { who: 'rosa', x: 96, z: 29, heading: Math.PI / 2 },
    { who: 'dario', x: 91, z: 27, heading: Math.PI / 2 },
  ]);
  game.setMode('play');
  game.setCameraMode('foot');
  game.parkHeli();
  return { shot, mode: 'play' };
}
