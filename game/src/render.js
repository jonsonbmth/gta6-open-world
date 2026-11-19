// Renderer, lighting and cameras.
//
// THE LIGHTING DESIGN (the V13 fix): every previous version put the sun AHEAD of
// the hero, so the rear and side facing the chase camera sat in shadow and the car
// read as a dark blob. Here the sun sits in the SOUTH-WEST sky — behind and above
// the chase camera, which looks north — so the camera-facing rear and the west side
// of the car are LIT. A dedicated warm hero light (a directional light that follows
// the hero from the camera side) guarantees the car body is bright in every shot,
// and an additive light-pool decal keeps the asphalt under the hero lit.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; // the post pass owns tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 6, 40);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, 160, 420);

  // Hemisphere: blue sky bounce + warm ground bounce, so shadows are never black.
  const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, PALETTE.hemiIntensity);
  scene.add(hemi);

  // Sun: south-west, low golden hour. Offset from the hero: west (-X), high (+Y),
  // south (+Z, behind the north-looking chase camera). Shadows fall north-east,
  // away from the viewer.
  const sun = new THREE.DirectionalLight(PALETTE.sun, PALETTE.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  // Hero light: warm, from the camera side, follows the hero. This is what makes
  // the car body read BRIGHT RED instead of a silhouette.
  const heroLight = new THREE.DirectionalLight(PALETTE.heroLight, 1.35);
  scene.add(heroLight);
  scene.add(heroLight.target);

  // Marina lights: two warm point lights over the quay (angled so highlights fall
  // outside the marina camera's view; the quay tops are rough, so no streak).
  const marinaLights = [];
  for (const [mx, mz] of [[90, 12], [90, 38]]) {
    const point = new THREE.PointLight(0xffc98a, 90, 34, 2);
    point.position.set(mx, 7, mz);
    scene.add(point);
    marinaLights.push(point);
  }

  const SUN_OFFSET = new THREE.Vector3(-55, 75, 115);
  const tmpCamDir = new THREE.Vector3();
  const tmpHeroPos = new THREE.Vector3();

  function updateLights(heroPos, cameraPos, shotMode) {
    // Sun follows the hero (shadow camera stays centred on the action).
    sun.position.copy(heroPos).add(SUN_OFFSET);
    sun.target.position.copy(heroPos);
    sun.target.updateMatrixWorld();
    // Hero light: from the camera side, above and behind the camera's view of
    // the hero, so the camera-facing surfaces are lit.
    tmpCamDir.copy(cameraPos).sub(heroPos).normalize();
    tmpHeroPos.copy(heroPos).addScaledVector(tmpCamDir, 18);
    tmpHeroPos.y = heroPos.y + 12;
    heroLight.position.copy(tmpHeroPos);
    heroLight.target.position.copy(heroPos);
    heroLight.target.updateMatrixWorld();
    heroLight.intensity = shotMode ? 1.9 : 1.35;
    sun.intensity = shotMode ? PALETTE.sunIntensity + 0.3 : PALETTE.sunIntensity;
  }

  // --- Camera rigs ---
  const desired = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camState = { mode: 'chase', frozen: false };

  function chaseCam(carPos, heading, dt, frozen) {
    // Behind the car (back ~7m), height ~2.0m, side offset ~3.0m toward the LIT
    // (west / local +X) side — a real 3/4 angle, so the sculpted side reads, not
    // just the flat rear. The forward vector is (sin h, 0, cos h).
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const rx = Math.cos(heading); // local +X (right) in world space
    const rz = -Math.sin(heading);
    desired.set(
      carPos.x - fx * 7.0 + rx * 3.0,
      carPos.y + 2.0,
      carPos.z - fz * 7.0 + rz * 3.0,
    );
    lookTarget.set(carPos.x + fx * 4, carPos.y + 1.1, carPos.z + fz * 4);
    if (frozen) {
      // Headless capture renders few frames: SNAP, never lerp, in shot mode.
      camera.position.copy(desired);
    } else {
      const k = 1 - Math.exp(-dt * 6);
      camera.position.lerp(desired, k);
    }
    camera.lookAt(lookTarget);
  }

  function footCam(playerPos, heading, dt, frozen) {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    desired.set(playerPos.x - fx * 7.5, playerPos.y + 3.6, playerPos.z - fz * 7.5);
    lookTarget.set(playerPos.x + fx * 5, playerPos.y + 1.4, playerPos.z + fz * 5);
    if (frozen) camera.position.copy(desired);
    else {
      const k = 1 - Math.exp(-dt * 6);
      camera.position.lerp(desired, k);
    }
    camera.lookAt(lookTarget);
  }

  // Title camera: a fixed cinematic frame looking north along the road. The
  // camera sits ON the road (x -3, not in the shop row) and the lookAt point sits
  // WEST of the hero, so the hero reads right-of-center at ~18% of frame, clear
  // of the START ENGINE button.
  function titleCam(heroPos) {
    camera.position.set(heroPos.x - 3, 3.0, heroPos.z + 12);
    camera.lookAt(heroPos.x - 5, 1.0, heroPos.z - 12);
  }

  function setSize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  return {
    renderer, scene, camera, sun, heroLight, marinaLights, camState,
    updateLights, chaseCam, footCam, titleCam, setSize,
  };
}
