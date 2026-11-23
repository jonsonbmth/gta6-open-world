// Story, jobs and dialogue for AURELIA BAY. Dante Vale works for fixer Vera
// Solano: eight jobs across the city, ending with THE EMBER RUN — the job the
// screenshots stage. Objectives are tracked with 3D beacon markers.
(function () {
  const AB = window.AB || (window.AB = {});

  const JOBS = [
    { id: 1, title: 'FIRST LIGHT', giver: 'VERA', brief: 'Pick up the package at the pier and bring it to the deli. No heat.', reward: 400 },
    { id: 2, title: 'SALT AND SMOKE', giver: 'HUGO', brief: 'The van at the market is wired wrong. Drive it to Hugo before it pops.', reward: 650 },
    { id: 3, title: 'PAPER MOON', giver: 'LENA', brief: 'Lena needs a clean car for the north run. Find one, lose the owner.', reward: 800 },
    { id: 4, title: 'LOW TIDE', giver: 'VERA', brief: 'Collect from three shops on Coral Market. Smile. Count twice.', reward: 1200 },
    { id: 5, title: 'GLASS HOUSE', giver: 'NINA', brief: 'Nina spotted a rival crew casing the hotel. Shadow them, don\'t engage.', reward: 1500 },
    { id: 6, title: 'NIGHT SHIFT', giver: 'HUGO', brief: 'Move the gold coupe from the docks to the garage on East Ave. Quiet.', reward: 2200 },
    { id: 7, title: 'CROSSCURRENT', giver: 'LENA', brief: 'The drop at the marina went sideways. Get Lena out, then the money.', reward: 3000 },
    { id: 8, title: 'THE EMBER RUN', giver: 'VERA', brief: 'One last run. The ledger is in the coupe. Lose the helicopter, reach the safehouse, and Aurelia Bay is yours.', reward: 8500 },
  ];

  const DIALOGUE = [
    { who: 'VERA', line: 'The whole city is watching, Dante. Drive like you mean it.' },
    { who: 'LENA', line: 'Helicopter on your six. Stay low, stay fast, stay pretty.' },
    { who: 'HUGO', line: 'That coupe is worth more than my shop. Try not to scratch it.' },
    { who: 'NINA', line: 'Roadblock forming on Sunset Mile. Take the coast road.' },
    { who: 'VERA', line: 'Eight jobs. One ledger. Don\'t make me regret any of them.' },
    { who: 'LENA', line: 'You drive like my grandmother. A very fast grandmother.' },
    { who: 'DISPATCH', line: 'All units, suspect vehicle is a red coupe, heading north on Sunset Mile.' },
    { who: 'HUGO', line: 'If the engine starts smoking, that\'s normal. Probably.' },
  ];

  // Districts: x/z is the gameplay anchor, lx/lz is where the label sits on
  // the pause map (spread out so no two labels collide).
  const DISTRICTS = [
    { name: 'SUNSET MILE', x: 0, z: 0, lx: 0, lz: -45, desc: 'Downtown chase corridor' },
    { name: 'CORAL MARKET', x: 0, z: 0, lx: 45, lz: 5, desc: 'Stalls, crowds, daytime deals' },
    { name: 'AURELIA COAST', x: -71, z: 0, lx: -71, lz: 80, desc: 'Beachfront and the pier road' },
    { name: 'EAST AVE', x: 60, z: 0, lx: 60, lz: -45, desc: 'Warehouses and garages' },
    { name: 'PALM SHORES', x: -120, z: 0, lx: -120, lz: 30, desc: 'Sand, palms and beach bars' },
    { name: 'NORTH CROSS', x: 0, z: -80, lx: 0, lz: -110, desc: 'Hotels and the north gate' },
    { name: 'SOUTH CROSS', x: 0, z: 80, lx: 0, lz: 110, desc: 'Motels and the south gate' },
    { name: 'THE PIER', x: -140, z: -30, lx: -155, lz: -90, desc: 'Sand, surf and the lifeguard tower' },
    { name: 'OLD HARBOR', x: 120, z: 120, lx: 120, lz: 120, desc: 'Crates, cranes and quiet deals' },
  ];

  // Objective beacon: a column of light + a floating diamond marker.
  function makeBeacon(color) {
    const g = new THREE.Group();
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 40, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    col.position.y = 20;
    g.add(col);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: color }));
    gem.position.y = 6;
    g.add(gem);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.3, 24),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    g.userData.gem = gem;
    return g;
  }

  function makeMissionState(scene) {
    const state = {
      currentJob: 8,
      stage: 0, // 0 reach pickup, 1 lose the heli, 2 reach the safehouse
      completed: 0,
      money: 12840,
      rep: 62,
      beacon: null,
      stages: [
        { text: 'REACH THE COUPE ON SUNSET MILE', pos: new THREE.Vector3(4, 0, 30), color: 0xf1c40f },
        { text: 'LOSE THE HELICOPTER — BREAK LINE OF SIGHT', pos: new THREE.Vector3(-71, 0, -120), color: 0xe74c3c },
        { text: 'REACH THE SAFEHOUSE ON THE COAST', pos: new THREE.Vector3(-64, 0, -150), color: 0x27ae60 },
      ],
    };
    state.beacon = makeBeacon(state.stages[0].color);
    state.beacon.position.copy(state.stages[0].pos);
    scene.add(state.beacon);
    return state;
  }

  function advanceMission(state, scene) {
    state.stage++;
    if (state.stage >= state.stages.length) {
      state.completed = 8;
      scene.remove(state.beacon);
      state.beacon = null;
      return 'done';
    }
    scene.remove(state.beacon);
    state.beacon = makeBeacon(state.stages[state.stage].color);
    state.beacon.position.copy(state.stages[state.stage].pos);
    scene.add(state.beacon);
    return 'stage';
  }

  function updateMission(state, playerPos, wanted, dt, t) {
    if (!state.beacon) return null;
    state.beacon.userData.gem.rotation.y += dt * 2;
    state.beacon.userData.gem.position.y = 6 + Math.sin(t * 2) * 0.5;
    const target = state.stages[state.stage].pos;
    const dist = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
    if (state.stage === 1) {
      // Lose the heli: wanted must drop to 0 while near the coast marker.
      if (wanted === 0 && dist < 25) return 'advance';
      return null;
    }
    if (dist < 6) return 'advance';
    return null;
  }

  AB.Missions = {
    JOBS: JOBS, DIALOGUE: DIALOGUE, DISTRICTS: DISTRICTS,
    makeMissionState: makeMissionState, advanceMission: advanceMission, updateMission: updateMission,
  };
})();
