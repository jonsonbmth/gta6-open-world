// Golden-hour sky: a warm sunset dome, a low orange sun with a long-shadow
// directional light, pink-lit clouds and a warm haze. This is the whole
// look of V24 — the flat midday light of V23 is what lost pairwise matches
// against the top entries, so every light here is warm and low.

import { canvasTexture, glowSprite, mulberry32, rand } from './util.js';

// The sun sits low in the west (towards the ocean), 11 degrees up: long
// shadows across the whole city, everything rim-lit gold.
export const SUNSET = {
  elevationDeg: 11,
  azimuthDeg: 262,
  sunColor: '#ff9a3c',
  horizonColor: '#ff7a3c',
  midColor: '#e85d7a',
  topColor: '#2a1a4e',
  fogColor: 0xdd7a52,
  fogNear: 90,
  fogFar: 420,
};

export function sunDirection() {
  const el = (SUNSET.elevationDeg * Math.PI) / 180;
  const az = (SUNSET.azimuthDeg * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize();
}

function skyTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#1d1238'); // zenith: deep indigo
    g.addColorStop(0.34, '#4a2560'); // upper: purple
    g.addColorStop(0.52, '#8e3a6e'); // mid: magenta
    g.addColorStop(0.66, '#e85d7a'); // low-mid: hot pink
    g.addColorStop(0.78, '#ff7a3c'); // horizon: burning orange
    g.addColorStop(0.88, '#ffb340'); // sun band: gold
    g.addColorStop(0.94, '#c95a3a'); // below horizon: dark warm
    g.addColorStop(1.0, '#7a2f28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // A warm bloom patch around the sun's azimuth (west, u ~ 0.72).
    const sx = w * 0.72;
    const sy = h * 0.82;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 260);
    glow.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 190, 90, 0.55)');
    glow.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  });
}

function cloudTexture(rng) {
  return canvasTexture(256, 96, (ctx, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = 30 + rng() * (w - 60);
      const y = 30 + rng() * (h - 55);
      const r = 14 + rng() * 26;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255, 205, 180, 0.55)');
      g.addColorStop(0.6, 'rgba(235, 140, 150, 0.28)');
      g.addColorStop(1, 'rgba(235, 140, 150, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function buildSky(scene, renderer) {
  // Warm haze so distant buildings melt into the sunset.
  scene.fog = new THREE.Fog(SUNSET.fogColor, SUNSET.fogNear, SUNSET.fogFar);

  // Sky dome.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 20),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(dome);

  const dir = sunDirection();

  // The sun disc itself: a crisp bright circle low over the ocean.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(34, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }),
  );
  sun.position.copy(dir).multiplyScalar(820);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const halo = glowSprite('rgba(255,160,60,0.55)', 260, 0.9);
  halo.position.copy(dir).multiplyScalar(800);
  scene.add(halo);
  const halo2 = glowSprite('rgba(255,110,80,0.35)', 520, 0.5);
  halo2.position.copy(dir).multiplyScalar(790);
  scene.add(halo2);

  // Pink-lit clouds, high and scattered.
  const rng = mulberry32(2411);
  const cloudTex = cloudTexture(rng);
  for (let i = 0; i < 14; i++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex, transparent: true, opacity: rand(rng, 0.5, 0.85),
      depthWrite: false, fog: false,
    });
    const s = new THREE.Sprite(mat);
    const a = rng() * Math.PI * 2;
    const r = rand(rng, 480, 760);
    s.position.set(Math.cos(a) * r, rand(rng, 130, 300), Math.sin(a) * r);
    s.scale.set(rand(rng, 160, 340), rand(rng, 36, 70), 1);
    scene.add(s);
  }

  // Low warm sun: long shadows, gold rims on everything.
  const sunLight = new THREE.DirectionalLight(0xffb066, 3.1);
  sunLight.position.copy(dir).multiplyScalar(220);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -130;
  sunLight.shadow.camera.right = 130;
  sunLight.shadow.camera.top = 130;
  sunLight.shadow.camera.bottom = -130;
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 520;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.02;
  sunLight.shadow.radius = 4;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Warm sky bounce + cool-ish ground fill so shadows stay readable.
  const hemi = new THREE.HemisphereLight(0xff9a7a, 0x3a2440, 1.05);
  scene.add(hemi);
  const fill = new THREE.AmbientLight(0x60405a, 0.5);
  scene.add(fill);

  // Frontal fill from the north: faces and rears that turn away from the
  // setting sun still read (three-point lighting: sun = key, this = fill).
  const northFill = new THREE.DirectionalLight(0xffd9b0, 0.4);
  northFill.position.set(-40, 60, -150);
  scene.add(northFill);
  scene.add(northFill.target);

  // Sunset environment for PBR reflections: the same gradient sky, baked
  // through PMREM so car paint, glass and metal pick up warm reflections.
  if (renderer) {
    const envTex = skyTexture();
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromEquirectangular(envTex).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.55;
    envTex.dispose();
    pmrem.dispose();
  }

  return { sunLight, hemi, sunDirection: dir };
}
