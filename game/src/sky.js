// Sky, sun and clouds for AURELIA BAY: a bright blue daytime sky with a warm
// late-afternoon sun, so the city reads sun-soaked, never dark or flat.
(function () {
  const AB = window.AB || (window.AB = {});

  function buildSky(scene) {
    // Gradient dome: deep blue overhead warming to a pale gold horizon.
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#2f6fc4');
    grad.addColorStop(0.45, '#6fa8dd');
    grad.addColorStop(0.75, '#bcd8ee');
    grad.addColorStop(1.0, '#ffe3b0');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    const skyTex = new THREE.CanvasTexture(c);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(600, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    scene.add(dome);

    // Warm sun disc + glow sprite high in the west.
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false });
    const sun = new THREE.Mesh(new THREE.CircleGeometry(22, 24), sunMat);
    sun.position.set(-260, 190, -380);
    sun.lookAt(0, 0, 0);
    scene.add(sun);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(46, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, fog: false })
    );
    glow.position.copy(sun.position).multiplyScalar(0.995);
    glow.lookAt(0, 0, 0);
    scene.add(glow);

    // Puffy clouds: clusters of flattened white spheres drifting slowly.
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
    const clouds = new THREE.Group();
    const spots = [
      [-120, 95, -180, 26], [60, 110, -240, 34], [180, 88, -120, 22],
      [-40, 120, 140, 30], [150, 100, 180, 26], [-220, 105, 60, 28],
      [20, 118, -60, 20], [260, 96, 40, 24], [-160, 112, 220, 26],
    ];
    spots.forEach(function (s) {
      const puff = new THREE.Group();
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const r = s[3] * (0.45 + Math.random() * 0.5);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
        ball.scale.y = 0.42;
        ball.position.set((Math.random() - 0.5) * s[3] * 1.6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 10);
        puff.add(ball);
      }
      puff.position.set(s[0], s[1], s[2]);
      clouds.add(puff);
    });
    scene.add(clouds);

    // Lighting rig: warm key sun, cool sky fill, soft ground bounce.
    const sunLight = new THREE.DirectionalLight(0xffe2b0, 2.9);
    sunLight.position.set(-90, 150, -70);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -120; sunLight.shadow.camera.right = 120;
    sunLight.shadow.camera.top = 120; sunLight.shadow.camera.bottom = -120;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);
    scene.add(new THREE.HemisphereLight(0x9cc4ee, 0x8a7a5c, 1.05));
    const bounce = new THREE.DirectionalLight(0xcfe4ff, 0.5);
    bounce.position.set(80, 60, 120);
    scene.add(bounce);

    scene.fog = new THREE.Fog(0xc4d9ec, 260, 620);
    return { dome, clouds, sunLight };
  }

  AB.Sky = { buildSky };
})();
