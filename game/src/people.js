// Sirena Bay — people. Every figure is built from ROUNDED geometry only:
// spheres, capsules and tapered cylinders. No box torsos, no cube heads, no
// slab feet — that is what read as Minecraft. Heads are deliberately large
// (about a fifth of the height, a stylised proportion) so the painted face
// stays readable at the camera's distance.
//
// A person is a hierarchy of pivot groups: hips -> torso -> neck -> head,
// shoulder pivots -> upper arm -> elbow -> forearm -> hand, hip pivots ->
// thigh -> knee -> shin -> foot. Poses set the pivots; the walk cycle swings
// them with a sine phase. buildPerson returns the group plus every pivot so
// the game loop and the staged shots can pose the figure.

(function () {
  'use strict';

  function mat(color, rough) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough === undefined ? 0.75 : rough, metalness: 0.02 });
  }

  function capsule(r, len, material) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), material);
    m.castShadow = true;
    return m;
  }

  function ball(r, material, sx, sy, sz) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), material);
    m.scale.set(sx || 1, sy || 1, sz || 1);
    m.castShadow = true;
    return m;
  }

  function tube(rTop, rBottom, len, material) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, len, 14), material);
    m.castShadow = true;
    return m;
  }

  // opts: skin, shirt, pants, shoes, hair (color), hairStyle, face (opts for
  // paintFaceTexture), height (scale, default 1). The figure faces +Z.
  function buildPerson(opts) {
    opts = opts || {};
    const skin = mat(opts.skin || '#e8b07e', 0.6);
    const shirt = mat(opts.shirt || '#2b6cb0');
    const pants = mat(opts.pants || '#2d3748');
    const shoes = mat(opts.shoes || '#1a202c', 0.5);
    const hairMat = mat(opts.hair || '#1c1410', 0.9);

    const root = new THREE.Group();
    const P = {}; // pivots

    // Hips — a flattened sphere, the body's centre.
    const hips = ball(0.155, pants, 1.15, 0.8, 0.85);
    hips.position.y = 0.88;
    root.add(hips);

    // Torso — a capsule, wider than deep. Chest and belly in one rounded
    // piece, with a belt line painted by a thin torus.
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.92;
    root.add(torsoPivot);
    const torso = capsule(0.16, 0.30, shirt);
    torso.scale.set(1.15, 1, 0.78);
    torso.position.y = 0.30;
    torsoPivot.add(torso);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.018, 8, 24), mat('#14100c', 0.5));
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.12, 0.8, 1);
    belt.position.y = 0.10;
    torsoPivot.add(belt);
    // Shoulder balls round the top of the torso off.
    const shL = ball(0.085, shirt);
    shL.position.set(-0.185, 0.52, 0);
    torsoPivot.add(shL);
    const shR = ball(0.085, shirt);
    shR.position.set(0.185, 0.52, 0);
    torsoPivot.add(shR);
    // A collar ring where the neck meets the shirt.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20), shirt);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.60;
    torsoPivot.add(collar);
    P.torso = torsoPivot;

    // Neck + head. The head is a sphere with the painted face texture; the
    // face is centred on +Z (u = 0.25 on the texture).
    const neck = tube(0.055, 0.065, 0.10, skin);
    neck.position.y = 1.56;
    root.add(neck);
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.70;
    root.add(headPivot);
    const faceTex = window.SB.faces.paintFaceTexture(opts.face || { skin: opts.skin || '#e8b07e' });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 28, 22),
      new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.0 })
    );
    head.castShadow = true;
    headPivot.add(head);
    // Hair: a 3D cap over the top of the skull, ending above the brows so it
    // can never cover the eyes. thetaLength 1.0 rad from the north pole.
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.192, 24, 12, 0, Math.PI * 2, 0, 1.0),
      hairMat
    );
    hairCap.position.y = 0.012;
    hairCap.castShadow = true;
    headPivot.add(hairCap);
    if (opts.hairStyle === 'long') {
      const back = ball(0.13, hairMat, 0.9, 1.5, 0.6);
      back.position.set(0, -0.10, -0.10);
      headPivot.add(back);
    }
    if (opts.hairStyle === 'ponytail') {
      const tail = capsule(0.05, 0.18, hairMat);
      tail.position.set(0, -0.05, -0.19);
      tail.rotation.x = 0.5;
      headPivot.add(tail);
    }
    // A small 3D nose tip adds depth to the painted nose.
    const nose = ball(0.028, skin, 0.8, 1.1, 0.9);
    nose.position.set(0, -0.015, 0.178);
    headPivot.add(nose);
    // Ears.
    const earL = ball(0.035, skin, 0.5, 0.9, 0.8);
    earL.position.set(-0.182, 0, 0);
    headPivot.add(earL);
    const earR = ball(0.035, skin, 0.5, 0.9, 0.8);
    earR.position.set(0.182, 0, 0);
    headPivot.add(earR);
    P.head = headPivot;

    // Arms. Shoulder pivot at the shoulder ball, upper arm capsule hanging
    // down from it, elbow pivot, forearm capsule, sphere hand.
    function buildArm(side) {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.21 * side, 1.44, 0);
      root.add(shoulder);
      const upper = capsule(0.058, 0.20, shirt);
      upper.position.y = -0.15;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.31;
      shoulder.add(elbow);
      const fore = capsule(0.05, 0.18, skin);
      fore.position.y = -0.14;
      elbow.add(fore);
      const hand = ball(0.062, skin, 0.9, 1.15, 0.9);
      hand.position.y = -0.30;
      elbow.add(hand);
      return { shoulder: shoulder, elbow: elbow };
    }
    const armL = buildArm(-1);
    const armR = buildArm(1);
    P.armL = armL.shoulder; P.elbowL = armL.elbow;
    P.armR = armR.shoulder; P.elbowR = armR.elbow;

    // Legs. Hip pivot, thigh capsule, knee pivot, shin capsule, rounded foot
    // (a squashed sphere pointing forward — never a box).
    function buildLeg(side) {
      const hip = new THREE.Group();
      hip.position.set(0.095 * side, 0.86, 0);
      root.add(hip);
      const thigh = capsule(0.078, 0.26, pants);
      thigh.position.y = -0.20;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      hip.add(knee);
      const shin = capsule(0.064, 0.26, pants);
      shin.position.y = -0.20;
      knee.add(shin);
      const foot = ball(0.075, shoes, 0.95, 0.6, 1.7);
      foot.position.set(0, -0.42, 0.05);
      knee.add(foot);
      return { hip: hip, knee: knee };
    }
    const legL = buildLeg(-1);
    const legR = buildLeg(1);
    P.legL = legL.hip; P.kneeL = legL.knee;
    P.legR = legR.hip; P.kneeR = legR.knee;

    root.scale.setScalar(opts.height || 1);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { group: root, pivots: P };
  }

  // --- Poses. Each sets pivot rotations; angles are radians. ---------

  function resetPose(P) {
    P.torso.rotation.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.armL.rotation.set(0, 0, 0.10);
    P.armR.rotation.set(0, 0, -0.10);
    P.elbowL.rotation.set(-0.15, 0, 0);
    P.elbowR.rotation.set(-0.15, 0, 0);
    P.legL.rotation.set(0, 0, 0);
    P.legR.rotation.set(0, 0, 0);
    P.kneeL.rotation.set(0, 0, 0);
    P.kneeR.rotation.set(0, 0, 0);
  }

  // Mid-stride walk, phase 0..2PI. Arms and legs swing opposite.
  function poseWalk(P, phase) {
    const s = Math.sin(phase);
    const c = Math.sin(phase + Math.PI);
    resetPose(P);
    P.legL.rotation.x = s * 0.55;
    P.legR.rotation.x = c * 0.55;
    P.kneeL.rotation.x = Math.max(0, -s) * 0.8;
    P.kneeR.rotation.x = Math.max(0, -c) * 0.8;
    P.armL.rotation.x = c * 0.45;
    P.armR.rotation.x = s * 0.45;
    P.elbowL.rotation.x = -0.3;
    P.elbowR.rotation.x = -0.3;
  }

  // Carrying a crate with both hands: arms forward and bent, slight lean.
  function poseCarry(P) {
    resetPose(P);
    P.armL.rotation.set(-1.05, 0, 0.35);
    P.armR.rotation.set(-1.05, 0, -0.35);
    P.elbowL.rotation.x = -0.9;
    P.elbowR.rotation.x = -0.9;
    P.torso.rotation.x = 0.08;
    P.legL.rotation.x = 0.35;
    P.legR.rotation.x = -0.3;
    P.kneeR.rotation.x = 0.5;
  }

  // Waving: right arm high, open hand, head tilted toward the wave.
  function poseWave(P) {
    resetPose(P);
    P.armR.rotation.set(-2.6, 0, -0.5);
    P.elbowR.rotation.x = -0.25;
    P.armL.rotation.set(-0.2, 0, 0.35);
    P.head.rotation.z = 0.10;
    P.head.rotation.y = -0.15;
  }

  // Kneeling by an engine: one knee on the ground, torso leaning in, both
  // hands forward on the work, head glancing up.
  function poseKneel(P) {
    resetPose(P);
    P.legL.rotation.x = -1.45;
    P.kneeL.rotation.x = 1.9;
    P.legR.rotation.x = 0.35;
    P.kneeR.rotation.x = 1.35;
    P.torso.rotation.x = 0.35;
    P.armL.rotation.set(-0.9, 0, 0.25);
    P.armR.rotation.set(-0.9, 0, -0.25);
    P.elbowL.rotation.x = -0.5;
    P.elbowR.rotation.x = -0.5;
    P.head.rotation.x = -0.35;
  }

  // Mid-conversation: one arm raised mid-gesture, other hand on hip, body
  // turned slightly toward the other speaker — but only slightly, so both
  // faces stay visible to the camera.
  function poseTalk(P, mirror) {
    resetPose(P);
    const m = mirror ? -1 : 1;
    P.armR.rotation.set(-0.9 * m * m, 0, -0.4);
    P.elbowR.rotation.x = -0.9;
    P.armL.rotation.set(-0.15, 0, 0.55);
    P.elbowL.rotation.x = -1.5;
    P.torso.rotation.y = 0.25 * m;
    P.head.rotation.y = 0.30 * m;
    P.legL.rotation.x = 0.08;
    P.legR.rotation.x = -0.08;
  }

  // Pointing at something in the distance.
  function posePoint(P) {
    resetPose(P);
    P.armR.rotation.set(-1.35, 0, -0.15);
    P.elbowR.rotation.x = -0.1;
    P.head.rotation.x = -0.08;
  }

  // Panic: both hands up, leaning back.
  function posePanic(P) {
    resetPose(P);
    P.armL.rotation.set(-2.7, 0, 0.5);
    P.armR.rotation.set(-2.7, 0, -0.5);
    P.torso.rotation.x = -0.12;
    P.head.rotation.x = -0.15;
  }

  window.SB.people = {
    buildPerson, resetPose, poseWalk, poseCarry, poseWave, poseKneel, poseTalk, posePoint, posePanic,
  };
})();
