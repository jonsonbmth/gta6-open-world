// Sky, sun and lighting: a bright BLUE daytime sky with a warm low sun, so
// the city reads sun-soaked without going all-orange. The sky is a big
// gradient dome with a few billboard clouds; lighting is a warm directional
// sun plus a cool sky hemisphere fill.

import { makeRng } from './util.js';

export function buildSky(scene) {
  // Gradient dome: deep blue at the top, pale warm blue at the horizon.
  const skyGeo = new THREE.SphereGeometry(900, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2f7fd0) },
      midColor: { value: new THREE.Color(0x7fb8e8) },
      bottomColor: { value: new THREE.Color(0xf6d9a8) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h > 0.25 ? mix(midColor, topColor, smoothstep(0.25, 0.8, h))
                          : mix(bottomColor, midColor, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Sun disc: a bright warm disc low in the west.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(46, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }),
  );
  sun.position.set(-620, 210, -260);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(90, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, fog: false }),
  );
  glow.position.copy(sun.position).add(new THREE.Vector3(0, 0, -2));
  glow.lookAt(0, 0, 0);
  scene.add(glow);

  // Soft billboard clouds.
  const rng = makeRng(99);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  for (let i = 0; i < 14; i++) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(rng.next() * 3);
    for (let j = 0; j < puffs; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rng.range(9, 18), 10, 8), cloudMat);
      puff.scale.y = 0.45;
      puff.position.set(j * rng.range(10, 16) - puffs * 6, rng.range(-2, 3), rng.range(-4, 4));
      group.add(puff);
    }
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.range(260, 620);
    group.position.set(Math.cos(angle) * dist, rng.range(120, 210), Math.sin(angle) * dist);
    scene.add(group);
  }
}

export function buildLights(scene) {
  // Warm directional sun from the west, casting soft shadows.
  const sun = new THREE.DirectionalLight(0xffe7b8, 2.4);
  sun.position.set(-120, 140, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  // Cool blue sky fill so shadows stay readable, never black.
  scene.add(new THREE.HemisphereLight(0x9cc8ee, 0x8a7a5f, 1.15));
  // Gentle warm bounce from the east so facades facing away from the sun
  // are not flat.
  const bounce = new THREE.DirectionalLight(0xffd9a0, 0.5);
  bounce.position.set(100, 60, 80);
  scene.add(bounce);
  return sun;
}
