// Screenshot staging: deterministic setups for ?shot=chase|title|map|marina.
// The camera snaps immediately (no lerp) so swiftshader's ~1 fps warm-up
// still lands the frame, and the HUD cues are forced visible for the chase.
var CV = window.CV || (window.CV = {});

CV.shots = (function () {
  var C = CV.config;

  function stageChase(game) {
    var hero = game.hero;
    hero.x = C.AVENUE_X; hero.z = -60; hero.heading = 0; hero.speed = 34;
    hero.drift = 0.6; hero.driftScore = 42;
    game.heroGroup.position.set(hero.x, 0, hero.z);
    game.heroGroup.rotation.y = hero.heading;
    // Police: ALL FOUR ahead of the chase camera (z > -55 at stage time),
    // spread across the road — their light bars + red/blue glow must show.
    var slots = [
      { x: 84, z: -46, h: 0 }, { x: 96, z: -40, h: 0 },
      { x: 86, z: -30, h: 0 }, { x: 82, z: -50, h: 0 },
    ];
    CV.police.units.forEach(function (u, i) {
      if (!slots[i]) return;
      u.state.x = slots[i].x; u.state.z = slots[i].z;
      u.state.heading = slots[i].h; u.state.speed = 25;
      u.group.position.set(slots[i].x, 0, slots[i].z);
      u.group.rotation.y = slots[i].h;
    });
    // Clear avenue traffic out of the hero's immediate path — a truck parked
    // on the hero's nose ruined the first chase shot. Spread the cars along
    // the avenue ahead and behind instead, so the street still reads alive.
    var spread = [-8, -33, -84, -110, -140];
    var si = 0;
    CV.traffic.cars.forEach(function (c) {
      if (Math.abs(c.x - C.AVENUE_X) < 10 && c.z > -140 && c.z < 10) {
        c.z = spread[si % spread.length];
        si++;
        c.g.position.set(c.x, 0, c.z);
      }
    });
    // Helicopter ahead-above, spotlight on the hero.
    game.heliPos = { x: hero.x + 10, z: hero.z + 24 };
    // Motion cues visible, like the top-10 covers.
    CV.hud.showCue('DRIFT x3', 'NEAR MISS +$250');
    CV.hud.hideTitle();
    CV.hud.hideMap();
    game.mode = 'drive';
    CV.render.update(game.scene, hero, 'drive', 0.016, 0, true);
  }

  function stageTitle(game) {
    var hero = game.hero;
    hero.x = C.AVENUE_X + 2; hero.z = -40; hero.heading = 0.35; hero.speed = 0;
    game.heroGroup.position.set(hero.x, 0, hero.z);
    game.heroGroup.rotation.y = hero.heading;
    // Police parked far down the avenue so the title stays clean.
    CV.police.units.forEach(function (u, i) {
      u.state.x = C.AVENUE_X + (i % 2 ? 4 : -4);
      u.state.z = -120 - i * 12;
      u.state.speed = 0;
      u.group.position.set(u.state.x, 0, u.state.z);
    });
    CV.hud.showTitle();
    CV.hud.hideMap();
    game.mode = 'title';
    CV.render.update(game.scene, hero, 'title', 0.016, 8, true);
  }

  function stageMap(game) {
    stageChase(game);
    CV.hud.showMap(game.hero, CV.missions.state.checkpoint);
    game.mode = 'map';
  }

  function stageMarina(game) {
    // On foot at the marina: Javi centre-front, 3 crew behind him in a row,
    // boats broadside behind them.
    game.mode = 'marina';
    game.foot.x = 79; game.foot.z = 171; game.foot.heading = Math.PI;
    if (game.javi) {
      game.javi.position.set(79, 0, 171);
      game.javi.rotation.y = Math.PI;
      game.javi.visible = true;
    }
    game.heroGroup.visible = false;
    CV.hud.hideTitle();
    CV.hud.hideMap();
    CV.hud.showCue('', '');
    CV.render.update(game.scene, game.foot, 'marina', 0.016, 0, true);
  }

  function stage(shot, game) {
    game.heroGroup.visible = true;
    if (game.javi) game.javi.visible = false;
    if (shot === 'title') stageTitle(game);
    else if (shot === 'map') stageMap(game);
    else if (shot === 'marina') stageMarina(game);
    else stageChase(game);
  }

  return { stage: stage };
})();
