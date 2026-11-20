// SOLMAR BAY — renderer, chase camera and the hero lighting rig.
// The hero light and the pool of light on the asphalt are what keep the red car
// bright and readable from the camera's side, whatever the sun does.

var SB = window.SB || (window.SB = {});

SB.render = (function () {
  let renderer = null;
  let camera = null;
  let heroLight = null;
  let pool = null;
  let camPos = null;
  let camLook = null;

  function init() {
    const canvas = document.getElementById('game-canvas');
    // ?lowfx=1 (used by the headless playtest): smaller shadow map, no
    // antialiasing, pixel ratio 1 — same game code, lighter raster load.
    const lowfx = new URLSearchParams(window.location.search).get('lowfx') === '1';
    SB.lowfx = lowfx;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !lowfx });
    renderer.setPixelRatio(lowfx ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 4000);
    camPos = new THREE.Vector3(0, 8, -14);
    camLook = new THREE.Vector3(0, 1, 0);

    // Hero light: a warm point light that rides above the car so the side facing
    // the camera is never in shadow.
    heroLight = new THREE.PointLight(0xffe6c0, 55, 48, 1.6);
    heroLight.position.set(0, 7, 0);

    // Light pool: a soft radial glow on the asphalt under the car.
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 232, 190, 0.35)');
    grad.addColorStop(0.55, 'rgba(255, 220, 160, 0.14)');
    grad.addColorStop(1, 'rgba(255, 210, 140, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const poolTex = new THREE.CanvasTexture(c);
    pool = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 32),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.06;

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Snap the chase camera behind the car at once (no lerp from the world
  // origin — the screenshot shot needs the framing right from the first frame).
  // 3/4 rear angle: offset well to the car's west (sunlit) side and pulled
  // close, so the hero fills ~25-30% of the frame and reads as a sports car
  // (side profile + rear, taillight bar, spoiler, spoked wheels, diffuser).
  function snapChaseCamera(carPos, heading) {
    const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    const right = { x: -Math.cos(heading), z: Math.sin(heading) };
    camPos.set(
      carPos.x + back.x * 4.1 - right.x * 3.0,
      (carPos.y || 0) + 2.0,
      carPos.z + back.z * 4.1 - right.z * 3.0
    );
    camLook.set(
      carPos.x + Math.sin(heading) * 6,
      (carPos.y || 0) + 1.2,
      carPos.z + Math.cos(heading) * 6
    );
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // Chase camera: low and close behind the car, on the LIT side (the sun is in
  // the south-west, behind/above the camera, so the car side we see is lit).
  // 3/4 rear angle, pulled close: the hero fills ~25-30% of the frame.
  // FOV widens slightly with speed for a sense of motion.
  function updateChaseCamera(carPos, heading, speed, dt) {
    const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    // Wide offset to the car's west (sunlit) side, so the camera sees the
    // car at a 3/4 rear angle instead of dead-centre behind it.
    const right = { x: -Math.cos(heading), z: Math.sin(heading) };
    const target = new THREE.Vector3(
      carPos.x + back.x * 4.1 - right.x * 3.0,
      (carPos.y || 0) + 2.0,
      carPos.z + back.z * 4.1 - right.z * 3.0
    );
    const look = new THREE.Vector3(
      carPos.x + Math.sin(heading) * 6,
      (carPos.y || 0) + 1.2,
      carPos.z + Math.cos(heading) * 6
    );
    const k = 1 - Math.exp(-6 * dt);
    camPos.lerp(target, k);
    camLook.lerp(look, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    const targetFov = 62 + Math.min(10, Math.abs(speed) * 0.22);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
    // Hero light + pool follow the car.
    heroLight.position.set(carPos.x, carPos.y + 6.5, carPos.z);
    pool.position.set(carPos.x, 0.06, carPos.z);
  }

  // Slow orbital camera for the title screen.
  function updateTitleCamera(time) {
    const a = time * 0.045;
    camera.position.set(Math.sin(a) * 190, 95 + Math.sin(time * 0.1) * 8, Math.cos(a) * 190);
    camera.lookAt(0, 12, 0);
    camera.fov = 55;
    camera.updateProjectionMatrix();
  }

  // Fixed camera for a screenshot shot: position + look-at, no smoothing.
  function setShotCamera(pos, look) {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(look[0], look[1], look[2]);
    camera.fov = 58;
    camera.updateProjectionMatrix();
  }

  return {
    init: init,
    renderer: function () { return renderer; },
    camera: function () { return camera; },
    heroLight: function () { return heroLight; },
    pool: function () { return pool; },
    updateChaseCamera: updateChaseCamera,
    snapChaseCamera: snapChaseCamera,
    updateTitleCamera: updateTitleCamera,
    setShotCamera: setShotCamera,
  };
})();
