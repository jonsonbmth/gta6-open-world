// Trees for AURELIA BAY, built to the San Andreas references: palms with tall
// thin trunks and distinct fan fronds radiating from the crown, and leafy
// trees with a trunk plus a clustered canopy — never green blobs on sticks.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  const trunkMat2 = new THREE.MeshLambertMaterial({ color: 0x7a5c3e });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8f3e, side: THREE.DoubleSide });
  const frondMat2 = new THREE.MeshLambertMaterial({ color: 0x3aa347, side: THREE.DoubleSide });
  const leafMats = [0x3d8a37, 0x4a9a3d, 0x357a2e].map(function (c) {
    return new THREE.MeshLambertMaterial({ color: c });
  });
  const nutMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });

  // One palm frond: a tapered leaf plane bent into a drooping arc.
  function frondGeometry(len, wid) {
    const geo = new THREE.PlaneGeometry(wid, len, 1, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); // -len/2 .. len/2, base at -len/2
      const t = (y + len / 2) / len; // 0 at base, 1 at tip
      // taper toward the tip and droop downward along the length
      pos.setX(i, pos.getX(i) * (1 - t * 0.85));
      pos.setZ(i, -t * t * len * 0.42);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const frondGeo = frondGeometry(3.4, 0.62);
  const frondGeoSmall = frondGeometry(2.6, 0.5);

  function makePalm(height) {
    const h = height || U.rand(7, 10);
    const palm = new THREE.Group();
    // Tall thin trunk in slightly offset segments for a gentle lean.
    const segs = 4;
    let x = 0, z = 0;
    const leanX = U.rand(-0.25, 0.25), leanZ = U.rand(-0.25, 0.25);
    for (let i = 0; i < segs; i++) {
      const r0 = 0.22 - i * 0.03, r1 = 0.22 - (i + 1) * 0.03;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(r1, r0, h / segs + 0.15, 7),
        i % 2 ? trunkMat : trunkMat2
      );
      x += leanX / segs; z += leanZ / segs;
      seg.position.set(x, (i + 0.5) * (h / segs), z);
      seg.rotation.z = -leanX * 0.06; seg.rotation.x = leanZ * 0.06;
      seg.castShadow = true;
      palm.add(seg);
    }
    // Crown: 9 fronds radiating outward, tilted down, plus young upright ones.
    const crown = new THREE.Group();
    crown.position.set(x, h, z);
    const count = 9;
    for (let i = 0; i < count; i++) {
      const frond = new THREE.Mesh(i % 2 ? frondGeo : frondGeoSmall, i % 2 ? frondMat : frondMat2);
      const holder = new THREE.Group();
      holder.rotation.y = (i / count) * Math.PI * 2 + U.rand(-0.15, 0.15);
      frond.rotation.x = -Math.PI / 2 + U.rand(0.5, 0.85); // arc out and down
      frond.position.y = 0.1;
      frond.castShadow = true;
      holder.add(frond);
      crown.add(holder);
    }
    // Coconut cluster under the crown.
    for (let i = 0; i < 3; i++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), nutMat);
      nut.position.set(U.rand(-0.25, 0.25), -0.25, U.rand(-0.25, 0.25));
      crown.add(nut);
    }
    palm.add(crown);
    return palm;
  }

  // Leafy tree: straight trunk + canopy of clustered spheres, varied greens.
  function makeLeafyTree(scale) {
    const s = scale || U.rand(0.9, 1.3);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 2.6 * s, 7), trunkMat2);
    trunk.position.y = 1.3 * s;
    trunk.castShadow = true;
    tree.add(trunk);
    const blobs = [
      [0, 3.4, 0, 1.5], [0.9, 2.9, 0.4, 1.05], [-0.85, 3.0, -0.3, 1.1],
      [0.2, 4.2, -0.4, 1.0], [-0.3, 2.8, 0.8, 0.95], [0.5, 3.6, 0.7, 0.9],
    ];
    blobs.forEach(function (b, i) {
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(b[3] * s, 1), leafMats[i % 3]);
      ball.position.set(b[0] * s, b[1] * s, b[2] * s);
      ball.scale.y = 0.82;
      ball.castShadow = true;
      tree.add(ball);
    });
    return tree;
  }

  // Hedge: a long low planter of dense foliage (the correct center divider:
  // green bushes, never pavement). Rounded top row softens the silhouette.
  function makeHedge(len, foliageTex) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ map: foliageTex });
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.55, 1.1), mat);
    body.position.y = 0.28;
    body.castShadow = true;
    g.add(body);
    const topMat = leafMats[1];
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i < n; i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), topMat);
      puff.position.set(-len / 2 + (i + 0.5) * (len / n), 0.62, 0);
      puff.scale.y = 0.62;
      puff.castShadow = true;
      g.add(puff);
    }
    return g;
  }

  AB.Trees = { makePalm, makeLeafyTree, makeHedge };
})();
