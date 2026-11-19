// Renderer, golden-hour lighting and post-processing.
//
// THE LIGHTING FIX (why V14 exists visually): the sun sits in the south-west,
// behind and above the chase camera, so the side of the hero car that faces
// the camera is always lit, never in shadow. A dedicated hero spotlight rides
// above the car and throws a warm pool of light onto the asphalt under it.

import { CFG } from './config.js';

export function createRender(canvasHost) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeeb87e, 260, 1000);

  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    2000,
  );
  camera.position.set(235, 6, 90);

  // --- Sky: three's Sky addon, sun matched to the directional light. ---
  const sky = new THREE.Sky();
  sky.scale.setScalar(1500);
  const sunDir = new THREE.Vector3(-0.62, 0.42, 0.55).normalize(); // south-west, low
  sky.material.uniforms.sunPosition.value.copy(sunDir);
  sky.material.uniforms.turbidity.value = 4.5;
  sky.material.uniforms.rayleigh.value = 1.6;
  sky.material.uniforms.mieCoefficient.value = 0.008;
  sky.material.uniforms.mieDirectionalG.value = 0.85;
  scene.add(sky);

  // --- Sun: warm directional light from the south-west with long shadows. ---
  const sun = new THREE.DirectionalLight(CFG.palette.sun, CFG.palette.sunIntensity);
  sun.position.copy(sunDir).multiplyScalar(420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 1000;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  // Warm ambient fill so shadowed faces never go black.
  const hemi = new THREE.HemisphereLight(
    CFG.palette.hemiSky,
    CFG.palette.hemiGround,
    0.65,
  );
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffe2b8, 0.2);
  scene.add(ambient);

  // --- Hero light: a warm spotlight that follows the car and lights the
  // car's camera side plus a pool of light on the asphalt beneath it.
  // Physical units: a modest intensity is plenty at this range.
  const heroLight = new THREE.SpotLight(0xfff1d6, 55, 45, 0.75, 0.65, 1.6);
  heroLight.position.set(0, 14, 0);
  heroLight.castShadow = false;
  scene.add(heroLight);
  scene.add(heroLight.target);

  // Soft golden bounce from below so the car's lower bodywork glows.
  const bounceLight = new THREE.PointLight(0xffc98a, 2.5, 14, 1.4);
  bounceLight.position.set(0, 1.2, 0);
  scene.add(bounceLight);

  // Studio reflections for the car paint (kept subtle so the golden hour
  // still reads as outdoors).
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  // --- Post: subtle bloom for the sun, windows and neon. ---
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.32,
    0.65,
    0.88,
  );
  composer.addPass(bloom);
  composer.addPass(new THREE.OutputPass());

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // Keep the hero rig glued to the car: spotlight from behind-above (the
  // camera side), target on the car, bounce light under the chassis.
  function followHero(carPos, heading) {
    const backX = Math.sin(heading) * 9;
    const backZ = Math.cos(heading) * 9;
    heroLight.position.set(carPos.x + backX, carPos.y + 13, carPos.z + backZ);
    heroLight.target.position.copy(carPos);
    bounceLight.position.set(carPos.x, carPos.y + 1.1, carPos.z);
    // The sun's shadow camera follows the action so shadows stay crisp.
    sun.position.set(
      carPos.x + sunDir.x * 420,
      sunDir.y * 420,
      carPos.z + sunDir.z * 420,
    );
    sun.target.position.set(carPos.x, 0, carPos.z);
  }

  return {
    renderer,
    scene,
    camera,
    composer,
    sun,
    heroLight,
    bounceLight,
    followHero,
    resize,
    render() {
      composer.render();
    },
  };
}
