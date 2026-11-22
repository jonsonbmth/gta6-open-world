// people.js — the proportional person factory for AURELIA BAY. Figures
// are built to real human proportions (head ~1/7.5 of height, legs ~47%,
// arms that reach mid-thigh), with faces (eyes, brows, nose, mouth) and
// varied hair — GTA San Andreas PS2 style, not capsule toys. Activities
// (walk, talk, phone, carry, wave) are poses on shoulder/hip pivots, so
// the same factory serves the staged shots and the walking crowd.

(function () {
  'use strict';

  var util = window.AB.util;

  // Shared geometries: one capsule per limb size, one head sphere — the
  // crowd reuses them, so 30+ people cost little geometry.
  var shared = null;

  function getShared() {
    if (shared) return shared;
    shared = {
      legGeo: new THREE.CapsuleGeometry(0.07, 0.68, 4, 10),
      armGeo: new THREE.CapsuleGeometry(0.05, 0.5, 4, 10),
      torsoGeo: new THREE.CylinderGeometry(0.17, 0.13, 0.55, 12),
      headGeo: new THREE.SphereGeometry(0.15, 16, 12),
      shoeGeo: new THREE.BoxGeometry(0.11, 0.07, 0.24),
      eyeGeo: new THREE.SphereGeometry(0.02, 8, 6),
      browGeo: new THREE.BoxGeometry(0.055, 0.012, 0.012),
      noseGeo: new THREE.SphereGeometry(0.022, 8, 6),
      mouthGeo: new THREE.BoxGeometry(0.06, 0.012, 0.01),
      handGeo: new THREE.SphereGeometry(0.05, 8, 6),
      boxGeo: new THREE.BoxGeometry(0.34, 0.24, 0.24),
      phoneGeo: new THREE.BoxGeometry(0.04, 0.09, 0.02),
      eyeMat: new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.4 }),
      mouthMat: new THREE.MeshStandardMaterial({ color: 0x6b3226, roughness: 0.6 }),
    };
    return shared;
  }

  function mat(color, rough) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough === undefined ? 0.8 : rough, metalness: 0 });
  }

  // One limb: a capsule pivoted at its top joint so poses and walk cycles
  // can swing it. Limbs do not cast shadows (only torso/head/thighs do) —
  // that keeps the shadow pass cheap with dozens of pedestrians on screen.
  function makeLimb(geo, material, length) {
    var pivot = new THREE.Group();
    var mesh = new THREE.Mesh(geo, material);
    mesh.position.y = -length / 2;
    pivot.add(mesh);
    return { pivot: pivot, mesh: mesh, length: length };
  }

  // Hair for a head of radius r. Styles: crop, bob, ponytail, beard, bald,
  // cap. The hair is a shell that hugs the skull — it never swallows the
  // face (a bug the V25r rebuild caught: a 0.75-pi cap hid the whole face).
  function addHair(headGroup, style, color, r) {
    var hairMat = mat(color, 0.9);
    var cap;
    if (style === 'ponytail') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      cap.position.y = r * 0.12;
      headGroup.add(cap);
      var tail = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.26, r * 0.9, 4, 8), hairMat);
      tail.position.set(0, -r * 0.35, -r * 1.05);
      tail.rotation.x = 0.35;
      headGroup.add(tail);
    } else if (style === 'bob') {
      // Top cap + cheek side panels: the face stays fully visible.
      cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.y = r * 0.1;
      headGroup.add(cap);
      [-1, 1].forEach(function (side) {
        var panel = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 10, 8), hairMat);
        panel.scale.set(0.5, 1.3, 0.8);
        panel.position.set(side * r * 0.95, -r * 0.35, r * 0.15);
        headGroup.add(panel);
      });
    } else if (style === 'beard') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
      cap.position.y = r * 0.14;
      headGroup.add(cap);
      var beard = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 12, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), hairMat);
      beard.position.set(0, -r * 0.1, r * 0.08);
      beard.scale.set(1, 0.9, 0.9);
      headGroup.add(beard);
    } else if (style === 'cap') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
      cap.position.y = r * 0.16;
      headGroup.add(cap);
      var brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, r * 0.1, 14, 1, false, -0.7, 1.4), hairMat);
      brim.position.set(0, r * 0.32, r * 0.45);
      brim.rotation.x = 0.15;
      headGroup.add(brim);
    } else if (style === 'bald') {
      // No hair; the head is bare.
    } else {
      // Short crop (default).
      cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      cap.position.y = r * 0.13;
      headGroup.add(cap);
    }
  }

  // A face: eyes, brows, nose and mouth placed on the +Z side of the head
  // sphere. The face is what the marina shot is judged on — every crew
  // member's face must read at a glance.
  function addFace(headGroup, r, skinTone) {
    var sh = getShared();
    var z = r * 0.92;
    [-1, 1].forEach(function (side) {
      var eye = new THREE.Mesh(sh.eyeGeo, sh.eyeMat);
      eye.position.set(side * r * 0.36, r * 0.18, z);
      headGroup.add(eye);
      var brow = new THREE.Mesh(sh.browGeo, sh.eyeMat);
      brow.position.set(side * r * 0.36, r * 0.42, z * 0.98);
      brow.rotation.z = side * -0.12;
      headGroup.add(brow);
    });
    var nose = new THREE.Mesh(sh.noseGeo, mat(skinTone, 0.6));
    nose.position.set(0, -r * 0.05, r * 1.0);
    nose.scale.set(0.8, 1.2, 0.8);
    headGroup.add(nose);
    var mouth = new THREE.Mesh(sh.mouthGeo, sh.mouthMat);
    mouth.position.set(0, -r * 0.38, r * 0.94);
    headGroup.add(mouth);
  }

  // Create one person. opts: skin, hair, hairStyle, shirt, pants, shoes,
  // activity, seed, scale, name. Returns {group, head, headRadius, height,
  // limbs, activity, phase}.
  function createPerson(opts) {
    var o = opts || {};
    var sh = getShared();
    var rng = util.mulberry32(o.seed || 1);
    var scale = o.scale || 1;
    var group = new THREE.Group();
    group.name = o.name || 'person';
    var skin = o.skin || 0xc68e5e;
    var skinMat = mat(skin, 0.65);
    var shirtMat = mat(o.shirt || 0x3a6ab0, 0.85);
    var pantsMat = mat(o.pants || 0x2a2f38, 0.85);
    var shoeMat = mat(o.shoes || 0x1a1a1a, 0.7);

    // Legs: hips at y=0.85, feet on the ground.
    var legL = makeLimb(sh.legGeo, pantsMat, 0.82);
    legL.pivot.position.set(-0.1, 0.85, 0);
    group.add(legL.pivot);
    var legR = makeLimb(sh.legGeo, pantsMat, 0.82);
    legR.pivot.position.set(0.1, 0.85, 0);
    group.add(legR.pivot);
    // Shoes at the end of each leg.
    [-0.1, 0.1].forEach(function (x) {
      var shoe = new THREE.Mesh(sh.shoeGeo, shoeMat);
      shoe.position.set(x, 0.035, 0.05);
      group.add(shoe);
    });
    // Torso: tapered cylinder, shoulders at y=1.32.
    var torso = new THREE.Mesh(sh.torsoGeo, shirtMat);
    torso.position.y = 1.12;
    torso.castShadow = true;
    group.add(torso);
    // Arms: shoulders at y=1.32, hands reaching mid-thigh.
    var armL = makeLimb(sh.armGeo, shirtMat, 0.6);
    armL.pivot.position.set(-0.21, 1.32, 0);
    group.add(armL.pivot);
    var armR = makeLimb(sh.armGeo, shirtMat, 0.6);
    armR.pivot.position.set(0.21, 1.32, 0);
    group.add(armR.pivot);
    // Hands.
    var handL = new THREE.Mesh(sh.handGeo, skinMat);
    handL.position.y = -0.62;
    armL.pivot.add(handL);
    var handR = new THREE.Mesh(sh.handGeo, skinMat);
    handR.position.y = -0.62;
    armR.pivot.add(handR);
    // Head: sphere r=0.15 at y=1.62, with a face and hair.
    var headGroup = new THREE.Group();
    headGroup.position.y = 1.62;
    var head = new THREE.Mesh(sh.headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);
    addFace(headGroup, 0.15, skin);
    addHair(headGroup, o.hairStyle || 'crop', o.hair || 0x201510, 0.15);
    group.add(headGroup);

    var person = {
      group: group,
      head: headGroup,
      headRadius: 0.15 * scale,
      height: 1.8 * scale,
      limbs: { legL: legL, legR: legR, armL: armL, armR: armR },
      activity: o.activity || 'idle',
      phase: rng() * Math.PI * 2,
      name: o.name || 'person',
    };

    applyPose(person, o.activity || 'idle', o);
    group.scale.setScalar(scale);
    return person;
  }

  // Static poses for the staged shots. Walk cycles animate in play mode.
  function applyPose(person, activity, opts) {
    var L = person.limbs;
    var o = opts || {};
    // Reset to neutral.
    L.legL.pivot.rotation.set(0, 0, 0);
    L.legR.pivot.rotation.set(0, 0, 0);
    L.armL.pivot.rotation.set(0, 0, 0.06);
    L.armR.pivot.rotation.set(0, 0, -0.06);
    if (activity === 'walk') {
      var p = person.phase;
      L.legL.pivot.rotation.x = Math.sin(p) * 0.45;
      L.legR.pivot.rotation.x = Math.sin(p + Math.PI) * 0.45;
      L.armL.pivot.rotation.x = Math.sin(p + Math.PI) * 0.3;
      L.armR.pivot.rotation.x = Math.sin(p) * 0.3;
    } else if (activity === 'talk') {
      L.armR.pivot.rotation.x = -0.9;
      L.armR.pivot.rotation.z = -0.3;
      L.armL.pivot.rotation.x = -0.25;
    } else if (activity === 'phone') {
      L.armR.pivot.rotation.x = -2.2;
      L.armR.pivot.rotation.z = -0.5;
      var phone = new THREE.Mesh(getShared().phoneGeo, getShared().eyeMat);
      phone.position.set(0.02, -0.62, 0.03);
      L.armR.pivot.add(phone);
    } else if (activity === 'carry') {
      L.armL.pivot.rotation.x = -1.1;
      L.armR.pivot.rotation.x = -1.1;
      var boxMat = mat(0xb08a4f, 0.9);
      var parcel = new THREE.Mesh(getShared().boxGeo, boxMat);
      parcel.position.set(0, 0.95, 0.32);
      person.group.add(parcel);
    } else if (activity === 'wave') {
      L.armR.pivot.rotation.z = Math.PI - 0.25;
      L.armR.pivot.rotation.x = -0.2;
    }
    // A slight lean or turn keeps the crowd from looking cloned.
    if (o.lean) person.group.rotation.z = o.lean;
  }

  // Advance a walk cycle (play mode): legs and arms swing in opposition.
  function updateWalk(person, time) {
    var L = person.limbs;
    var t = time * 5 + person.phase;
    L.legL.pivot.rotation.x = Math.sin(t) * 0.5;
    L.legR.pivot.rotation.x = Math.sin(t + Math.PI) * 0.5;
    L.armL.pivot.rotation.x = Math.sin(t + Math.PI) * 0.35;
    L.armR.pivot.rotation.x = Math.sin(t) * 0.35;
  }

  window.AB.people = {
    createPerson: createPerson,
    applyPose: applyPose,
    updateWalk: updateWalk,
  };
})();
