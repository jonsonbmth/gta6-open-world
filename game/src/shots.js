// Screenshot staging: ?shot=chase|title|map|marina puts the game into a
// deterministic, photogenic state for each of the four screenshots. The chase
// shot fixes V17's nits: a BIG close helicopter, ALL FOUR cruisers in frame,
// a toned-down spotlight pool, and the marina shot shows the crew's FACES
// under a cloud-rich sky.

(function () {
  'use strict';

  const Shots = {
    // GPS route: hero -> garage on Solana Avenue (for minimap + pause map).
    route: [
      { x: 6, z: 17 }, { x: 4, z: -30 }, { x: 4, z: -80 },
      { x: -24, z: -96 }, { x: -52, z: -96 }, { x: -64, z: -70 },
    ],
    active: '',
    staged: false,

    stage(shot, ctx) {
      this.active = shot;
      this.staged = !!shot;
      const C = VB.CONFIG;
      const M = VB.missions.state;
      M.started = true;
      if (shot === 'chase') {
        // Hero + 4 cruisers + big heli exactly as staged in config.
        const h = VB.cars.hero;
        h.position.set(C.chase.heroPos.x, 0, C.chase.heroPos.z);
        h.rotation.y = C.chase.heroRot;
        VB.cars.heroState.speed = 30; // 108 km/h on the dial
        VB.cars.heroState.heading = C.chase.heroRot;
        C.chase.cruisers.forEach((c, i) => {
          VB.cars.cruisers[i].position.set(c.x, 0, c.z);
          VB.cars.cruisers[i].rotation.y = c.rot;
        });
        VB.police.heli.position.set(C.chase.heliPos.x, C.chase.heliPos.y, C.chase.heliPos.z);
        VB.police.heli.scale.setScalar(C.chase.heliScale);
        ctx.camera.position.set(C.chase.camPos.x, C.chase.camPos.y, C.chase.camPos.z);
        ctx.camera.lookAt(C.chase.camLook.x, C.chase.camLook.y, C.chase.camLook.z);
        VB.hud.setPopup('DRIFT x3', 'NEAR MISS +$250');
        VB.hud.showTitle(false);
      } else if (shot === 'title') {
        M.started = false;
        VB.hud.showTitle(true);
        ctx.camera.position.set(24, 7, 46);
        ctx.camera.lookAt(0, 3, -10);
        document.body.classList.add('on-title');
      } else if (shot === 'map') {
        VB.hud.showPause(true);
        ctx.camera.position.set(24, 7, 46);
        ctx.camera.lookAt(0, 3, -10);
      } else if (shot === 'marina') {
        VB.peds.buildMarinaCrew(ctx.scene);
        // Camera on the quay, looking at the crew's FACES with the ocean,
        // boats and cloud-rich sunset sky behind them.
        ctx.camera.position.set(0, 3.4, -156);
        ctx.camera.lookAt(0, 2.2, -172);
        VB.hud.setPopup('', '');
        document.body.classList.add('on-marina');
        VB.hud.setDialog('crew0');
        VB.missions.dialog.idx = 2;
        VB.hud.setDialog('crew0');
      }
    },
  };

  VB.shots = Shots;
})();
