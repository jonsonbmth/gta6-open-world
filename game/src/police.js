// Wanted system and police pursuit for AURELIA BAY. Cruisers chase the
// player along the streets (they slide around block corners like the player
// car), the wanted level rises on crimes and cools off out of sight, and the
// dispatch board feeds the HUD with live unit callouts.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const DISPATCH_UNITS = [
    { id: 'UNIT 7', area: 'SUNSET MILE', status: 'PURSUIT' },
    { id: 'UNIT 12', area: 'CORAL MARKET', status: 'EN ROUTE' },
    { id: 'UNIT 3', area: 'AURELIA BLVD', status: 'ROADBLOCK' },
    { id: 'AIR 1', area: 'DOWNTOWN', status: 'AIRBORNE' },
    { id: 'UNIT 9', area: 'EAST AVE', status: 'STANDBY' },
    { id: 'UNIT 21', area: 'WEST AVE', status: 'PATROL' },
  ];

  function makePolice(scene, blocks) {
    const state = {
      wanted: 0, heat: 0, lastSeen: 0, cruisers: [], blocks: blocks,
    };
    // 4 cruisers parked at staging points; they activate with the wanted level.
    const starts = [[6, -40], [-6, 60], [-67, -80], [14, 120]];
    for (let i = 0; i < 4; i++) {
      const car = AB.Vehicles.makeCar({ style: 'cruiser', color: 0x1a1d20 });
      car.position.set(starts[i][0], 0, starts[i][1]);
      car.rotation.y = U.rand(0, Math.PI * 2);
      car.userData.speed = 0;
      car.userData.heading = car.rotation.y;
      scene.add(car);
      state.cruisers.push(car);
    }
    return state;
  }

  function addHeat(state, amount) {
    state.heat = U.clamp(state.heat + amount, 0, 100);
    const level = state.heat < 8 ? 0 : state.heat < 25 ? 1 : state.heat < 45 ? 2 :
      state.heat < 65 ? 3 : state.heat < 85 ? 4 : 5;
    const changed = level !== state.wanted;
    state.wanted = level;
    state.lastSeen = performance.now();
    return changed;
  }

  function setWanted(state, level) {
    state.wanted = level;
    state.heat = [0, 12, 30, 50, 70, 90][level];
    state.lastSeen = performance.now();
  }

  // Circle vs block AABB push-out, shared with the player car.
  function resolveBlocks(pos, radius, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const cx = U.clamp(pos.x, b[0], b[1]);
      const cz = U.clamp(pos.z, b[2], b[3]);
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          pos.x = b[1] + radius;
        }
      }
    }
  }

  function updatePolice(state, playerPos, dt, now) {
    // Wanted cools off when the player stays far away and out of trouble.
    const distToPlayer = Math.hypot(playerPos.x - state.cruisers[0].position.x, playerPos.z - state.cruisers[0].position.z);
    if (state.wanted > 0 && now - state.lastSeen > 12000 && distToPlayer > 70) {
      state.heat = Math.max(0, state.heat - dt * 2.5);
      if (state.heat < [0, 8, 25, 45, 65, 85][state.wanted]) state.wanted = Math.max(0, state.wanted - 1);
    }
    const active = Math.min(state.cruisers.length, state.wanted >= 4 ? 4 : state.wanted >= 2 ? 3 : state.wanted >= 1 ? 2 : 0);
    state.cruisers.forEach(function (car, i) {
      const bar = car.userData.lightBar;
      if (bar) bar.visible = state.wanted > 0 && i < active;
      if (i >= active || state.wanted === 0) {
        car.userData.speed = Math.max(0, car.userData.speed - dt * 8);
        AB.Vehicles.driveWheels(car, car.userData.speed, 0, dt);
        return;
      }
      // Pursuit: steer toward the player with limited turn rate.
      const dx = playerPos.x - car.position.x;
      const dz = playerPos.z - car.position.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz) + Math.PI / 2;
      let diff = targetHeading - car.userData.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.userData.heading += U.clamp(diff, -1.6 * dt, 1.6 * dt);
      car.rotation.y = car.userData.heading;
      const maxSpeed = 16 + state.wanted * 1.5;
      car.userData.speed = U.clamp(car.userData.speed + dt * 9, 0, dist < 6 ? 6 : maxSpeed);
      const fx = Math.cos(car.userData.heading), fz = -Math.sin(car.userData.heading);
      car.position.x += fx * car.userData.speed * dt;
      car.position.z += fz * car.userData.speed * dt;
      resolveBlocks(car.position, 2.2, state.blocks);
      AB.Vehicles.driveWheels(car, car.userData.speed, U.clamp(diff, -1, 1), dt);
      if (dist < 40) state.lastSeen = now;
    });
  }

  AB.Police = { makePolice, addHeat, setWanted, updatePolice, resolveBlocks, DISPATCH_UNITS: DISPATCH_UNITS };
})();
