// Renderer + cameras: low close 3/4 chase cam, on-foot camera, hero light and
// the pool of light on the asphalt under the car. Clean air, thin fog.
import { poolTexture, glowTexture } from './textures.js';
import { clamp, angleLerp } from './random.js';

const THREE = window.THREE;

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(1280, 720);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 2400);

  // Hero light: warm point light that rides above/behind the car so the hero
  // is never in shadow, plus a soft pool of light on the asphalt.
  const heroLight = new THREE.PointLight(0xffd9a0, 60, 26, 1.6);
  scene.add(heroLight);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);

  let camPos = new THREE.Vector3(0, 6, -14);
  let camLook = new THREE.Vector3(0, 1, 0);

  function updateChase(dt, carPos, carAngle, speed01) {
    // 3/4 rear: 4.1 m back, 3.0 m to the sunlit (west) side, 2.0 m up.
    const back = 4.1 + speed01 * 1.6;
    const side = 3.0;
    const height = 2.0 + speed01 * 0.5;
    const fx = -Math.cos(carAngle); const fz = Math.sin(carAngle);
    const rx = fz; const rz = -fx; // right vector
    const target = new THREE.Vector3(
      carPos.x - fx * back + rx * side,
      height,
      carPos.z - fz * back + rz * side,
    );
    const k = 1 - Math.pow(0.0001, dt); // smooth follow
    camPos.lerp(target, k);
    const look = new THREE.Vector3(carPos.x + fx * 6, 1.1, carPos.z + fz * 6);
    camLook.lerp(look, 1 - Math.pow(0.001, dt));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.fov = 62 + speed01 * 7;
    camera.updateProjectionMatrix();
    heroLight.position.set(carPos.x - fx * 1.5, 4.5, carPos.z - fz * 1.5);
    pool.position.set(carPos.x, 0.05, carPos.z);
  }

  function updateOnFoot(dt, pos, angle) {
    const fx = -Math.cos(angle); const fz = Math.sin(angle);
    const target = new THREE.Vector3(pos.x - fx * 5.5, 3.4, pos.z - fz * 5.5);
    const k = 1 - Math.pow(0.0001, dt);
    camPos.lerp(target, k);
    const look = new THREE.Vector3(pos.x + fx * 5, 1.4, pos.z + fz * 5);
    camLook.lerp(look, 1 - Math.pow(0.001, dt));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.fov = 60;
    camera.updateProjectionMatrix();
    heroLight.position.set(pos.x, 4, pos.z);
    pool.position.set(pos.x, 0.05, pos.z);
  }

  function snapChase(carPos, carAngle) {
    const fx = -Math.cos(carAngle); const fz = Math.sin(carAngle);
    const rx = fz; const rz = -fx;
    camPos.set(carPos.x - fx * 4.1 + rx * 3.0, 2.0, carPos.z - fz * 4.1 + rz * 3.0);
    camLook.set(carPos.x + fx * 6, 1.1, carPos.z + fz * 6);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function snapOrbit(center, radius, height, lookY = 2) {
    camPos.set(center.x + radius * 0.7, height, center.z - radius * 0.7);
    camLook.set(center.x, lookY, center.z);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // Snap the on-foot camera behind the walker (no lerp — shots need it exact).
  function snapOnFoot(pos, angle) {
    const fx = -Math.cos(angle); const fz = Math.sin(angle);
    camPos.set(pos.x - fx * 5.5, 3.4, pos.z - fz * 5.5);
    camLook.set(pos.x + fx * 5, 1.4, pos.z + fz * 5);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // Snap a title-screen camera: close 3/4 rear-side view of the hero car,
  // car right of centre so the START button never covers it.
  function snapTitle(carPos, carAngle) {
    const fx = -Math.cos(carAngle); const fz = Math.sin(carAngle);
    const rx = fz; const rz = -fx;
    camPos.set(carPos.x - fx * 9 + rx * 5, 3.5, carPos.z - fz * 9 + rz * 5);
    camLook.set(carPos.x + fx * 1, 1.0, carPos.z + fz * 1 - 4);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  return {
    renderer, scene, camera,
    updateChase, updateOnFoot, snapChase, snapOrbit, snapOnFoot, snapTitle,
    render() { renderer.render(scene, camera); },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    },
  };
}

// Animate the sea texture slowly and pulse the checkpoint beacons.
export function animateWorld(world, t, dt) {
  if (world.seaMesh && world.seaMesh.material.map) {
    world.seaMesh.material.map.offset.x = (t * 0.008) % 1;
    world.seaMesh.material.map.offset.y = (t * 0.004) % 1;
  }
  for (const b of world.beacons) {
    const s = 1 + Math.sin(t * 2.4) * 0.12;
    b.scale.set(s, 1, s);
    b.children[2].position.y = 9 + Math.sin(t * 2.4) * 0.5;
  }
}
