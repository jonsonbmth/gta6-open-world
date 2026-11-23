// Screenshot staging for AURELIA BAY. ?shot=1..4 pins the exact composition
// the dossier screenshots capture. Everything staged here is deterministic —
// the same URL always produces the same frame.
(function () {
  const AB = window.AB || (window.AB = {});

  function shotNumber() {
    const m = /[?&]shot=(\d)/.exec(location.search);
    return m ? Number(m[1]) : 0;
  }

  // Stage extra vehicles around a point so the street reads dense.
  function stageVehicles(scene, specs) {
    const cars = [];
    specs.forEach(function (s) {
      const car = AB.Vehicles.makeCar({ style: s.style || 'sedan', color: s.color });
      car.position.set(s.x, 0, s.z);
      car.rotation.y = s.ry || 0;
      scene.add(car);
      cars.push(car);
    });
    return cars;
  }

  // Stage extra people around a point (shoppers, browsers, onlookers).
  function stagePeople(scene, specs) {
    const people = [];
    specs.forEach(function (s) {
      const p = AB.People.makePerson(s);
      p.position.set(s.x, s.y !== undefined ? s.y : 0.18, s.z);
      p.userData.baseY = s.y !== undefined ? s.y : 0.18;
      p.rotation.y = s.ry || 0;
      scene.add(p);
      people.push(p);
    });
    return people;
  }

  function stageShot(game) {
    const n = shotNumber();
    if (!n) return 0;
    const scene = game.scene;
    const staged = { cars: [], people: [] };

    if (n === 1) {
      // Downtown chase: hero coupe mid-boulevard, heli big overhead, dense
      // traffic, cruisers closing in from behind.
      game.setDriving(true);
      game.hero.position.set(4, 0, 42);
      game.hero.rotation.y = Math.PI / 2;
      game.heroSpeed = 22;
      game.heading = Math.PI / 2;
      AB.Police.setWanted(game.police, 4);
      AB.Heli.stageHeli(game.heli, 0, 30, -2, new THREE.Vector3(4, 0, 42));
      // Frame it explicitly: chase camera pitched up so the heli sits in the
      // upper frame and the hero coupe fills the lower center, offset to one
      // side so the car's sculpted 3/4 profile reads.
      game.camera.position.set(6.5, 4.6, 53.5);
      game.camera.lookAt(4, 4.2, 36);
      staged.cars = stageVehicles(scene, [
        { x: 4, z: 18, ry: Math.PI / 2, style: 'sport', color: 0x3a6ea5 },
        { x: 4, z: -6, ry: Math.PI / 2, style: 'taxi', color: 0xf2c230 },
        { x: -4, z: 26, ry: -Math.PI / 2, style: 'sedan', color: 0xc0c0c8 },
        { x: -4, z: -2, ry: -Math.PI / 2, style: 'sedan', color: 0x2e7d5b },
        { x: 4, z: -28, ry: Math.PI / 2, style: 'sedan', color: 0x8a8f96 },
        { x: -4, z: 62, ry: -Math.PI / 2, style: 'cruiser', color: 0x1a1d20 },
        { x: 4, z: 72, ry: Math.PI / 2, style: 'cruiser', color: 0x1a1d20 },
      ]);
      staged.people = stagePeople(scene, [
        { x: -11, z: 30, ry: 1.5 }, { x: -11, z: 12, ry: 1.2 }, { x: 11, z: 24, ry: -1.4 },
        { x: 11, z: 2, ry: -1.6 }, { x: -11, z: -14, ry: 1.8 }, { x: 11, z: -30, ry: -1.2 },
      ]);
      game.hud.addScore('DRIFT x3  +450', 'gold');
      game.hud.addScore('NEAR MISS  +150', '');
      game.hud.showToast('THE EMBER RUN', 'LOSE THE HELICOPTER — JOB 8 / 8');
    }

    if (n === 2) {
      // On foot at Coral Market: stalls, crowds, string lights, shopfronts.
      game.setDriving(false);
      game.dante.position.set(-2, 0, 1.5);
      game.dante.rotation.y = Math.PI / 2;
      game.dante.userData.baseY = 0;
      game.playerPos.copy(game.dante.position);
      game.heading = Math.PI / 2;
      AB.Police.setWanted(game.police, 0);
      game.heli.visible = false;
      game.mission.currentJob = 4;
      game.mission.stages[0].text = 'COLLECT FROM THREE SHOPS ON CORAL MARKET';
      game.camera.position.set(-8.5, 3.0, 1.5);
      game.camera.lookAt(-2, 1.5, 1.5);
      staged.people = stagePeople(scene, [
        { x: -20, z: 8.2, ry: Math.PI, cap: true }, { x: -14, z: 8.4, ry: Math.PI },
        { x: -8, z: 8.2, ry: 2.6, backpack: true }, { x: 2, z: 8.4, ry: Math.PI },
        { x: 12, z: 8.2, ry: 3.4 }, { x: 20, z: 8.4, ry: Math.PI },
        { x: -18, z: -8.2, ry: 0.4 }, { x: -4, z: -8.4, ry: 0 },
        { x: 8, z: -8.2, ry: -0.3, cap: true }, { x: 26, z: -8.4, ry: 0.2 },
        { x: -2, z: 3.5, ry: 1.2, y: 0 }, { x: 6, z: -3, ry: -1.1, y: 0 },
      ]);
      staged.cars = stageVehicles(scene, [
        { x: -30, z: 3, ry: Math.PI, style: 'sedan', color: 0x3a6ea5 },
        { x: 34, z: -3, ry: 0, style: 'taxi', color: 0xf2c230 },
      ]);
      game.hud.showToast('CORAL MARKET', 'JOB 4 — LOW TIDE · COLLECT FROM THREE SHOPS');
    }

    if (n === 3) {
      // Pause menu over the downtown chase (same staging as shot 1).
      game.setDriving(true);
      game.hero.position.set(4, 0, 42);
      game.hero.rotation.y = Math.PI / 2;
      game.heroSpeed = 0;
      game.heading = Math.PI / 2;
      AB.Police.setWanted(game.police, 4);
      AB.Heli.stageHeli(game.heli, 0, 30, -2, new THREE.Vector3(4, 0, 42));
      staged.cars = stageVehicles(scene, [
        { x: 4, z: 18, ry: Math.PI / 2, style: 'sport', color: 0x3a6ea5 },
        { x: -4, z: 26, ry: -Math.PI / 2, style: 'sedan', color: 0xc0c0c8 },
      ]);
      // The game is paused, so the chase camera never lerps — frame it here,
      // pitched up like shot 1 so the helicopter stays in the upper frame.
      game.camera.position.set(6.5, 5.5, 54);
      game.camera.lookAt(4, 4.2, 36);
      game.paused = true;
      game.hud.setPaused(true);
      // The HUD never updates while paused, so sync it once (stars, district).
      game.hud.update(0, 0);
    }

    if (n === 4) {
      // Coastal chase: hero coupe on Aurelia Blvd, heli overhead, beach and
      // palms to the west, ocean beyond, cruisers behind.
      game.setDriving(true);
      game.hero.position.set(-67.5, 0, 42);
      game.hero.rotation.y = Math.PI / 2;
      game.heroSpeed = 24;
      game.heading = Math.PI / 2;
      AB.Police.setWanted(game.police, 4);
      AB.Heli.stageHeli(game.heli, -71, 30, -2, new THREE.Vector3(-67.5, 0, 42));
      game.camera.position.set(-65, 4.6, 53.5);
      game.camera.lookAt(-67.5, 4.2, 36);
      staged.cars = stageVehicles(scene, [
        { x: -67.5, z: 16, ry: Math.PI / 2, style: 'sport', color: 0x2e7d5b },
        { x: -67.5, z: -10, ry: Math.PI / 2, style: 'taxi', color: 0xf2c230 },
        { x: -74.5, z: 28, ry: -Math.PI / 2, style: 'sedan', color: 0xc0c0c8 },
        { x: -74.5, z: -4, ry: -Math.PI / 2, style: 'sedan', color: 0x8a8f96 },
        { x: -67.5, z: -32, ry: Math.PI / 2, style: 'sedan', color: 0x3a6ea5 },
        { x: -74.5, z: 64, ry: -Math.PI / 2, style: 'cruiser', color: 0x1a1d20 },
        { x: -67.5, z: 74, ry: Math.PI / 2, style: 'cruiser', color: 0x1a1d20 },
      ]);
      staged.people = stagePeople(scene, [
        { x: -82, z: 30, ry: 1.5 }, { x: -82, z: 8, ry: 1.2 }, { x: -61.5, z: 20, ry: -1.4 },
        { x: -61.5, z: -6, ry: -1.6 }, { x: -100, z: 18, ry: 0.5, tank: true, y: 0.02 },
        { x: -110, z: -12, ry: -0.4, tank: true, y: 0.02 },
      ]);
      game.hud.addScore('NEAR MISS  +150', '');
      game.hud.addScore('TOP SPEED  142 KM/H', 'gold');
      game.hud.showToast('THE EMBER RUN', 'COAST ROAD — STAY AHEAD OF AIR 1');
    }

    game.staged = staged;
    // Sync the tracked player position to the staged pose (setDriving copied
    // the pre-staging position, and shot mode never drives to refresh it).
    game.playerPos.copy(game.inCar ? game.hero.position : game.dante.position);
    return n;
  }

  AB.Shots = { shotNumber: shotNumber, stageShot: stageShot };
})();
