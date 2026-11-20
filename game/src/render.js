// Camera + lighting rig: the 3/4 rear chase camera, title drift, on-foot
// follow, marina framing, hero light, and the sun-sprite safety toggle.
var CV = window.CV || (window.CV = {});

CV.render = (function () {
  var camera = null, renderer = null;
  var camPos = new THREE.Vector3();
  var camLook = new THREE.Vector3();
  var heroLight = null;
  var sunSprite = null;

  function init(scene, canvasParent) {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    canvasParent.appendChild(renderer.domElement);
    camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 2000);
    camera.position.set(80, 6, -80);
    // Hero light: warm point light that follows the car so it always pops.
    heroLight = new THREE.PointLight(0xffd9a0, 60, 30, 1.6);
    scene.add(heroLight);
    sunSprite = scene.getObjectByName('sunSprite');
    window.addEventListener('resize', function () {
      var w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    return { renderer: renderer, camera: camera };
  }

  // Chase camera: 3/4 rear — back 4.1 m, lateral 3.0 m, height 2.0 m (the
  // V16-polished framing, hero fills ~25-30% of frame).
  function chaseCam(hero, dt, snap) {
    var h = hero.heading;
    var fx = Math.sin(h), fz = Math.cos(h);
    var sx = Math.cos(h), sz = -Math.sin(h);
    var tx = hero.x - fx * 4.1 + sx * 3.0;
    var tz = hero.z - fz * 4.1 + sz * 3.0;
    var ty = 2.0;
    var lx = hero.x + fx * 8, ly = 2.5, lz = hero.z + fz * 8;
    if (snap) {
      camPos.set(tx, ty, tz);
      camLook.set(lx, ly, lz);
    } else {
      var k = 1 - Math.pow(0.0001, dt);
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (ty - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;
      camLook.x += (lx - camLook.x) * k;
      camLook.y += (ly - camLook.y) * k;
      camLook.z += (lz - camLook.z) * k;
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function titleCam(t, hero) {
    // Close on the parked hero car, rear 3/4, right of centre so the title
    // text and START button stay clear of it. Shot from the west side of
    // the avenue — the east-side palms crowd the frame from the other side.
    var x = hero.x - 9 + Math.sin(t * 0.05) * 1.5;
    var z = hero.z - 13 + Math.sin(t * 0.03) * 2;
    camera.position.set(x, 2.8, z);
    camera.lookAt(hero.x - 2, 1.3, hero.z + 8);
  }

  function footCam(hero, dt, snap) {
    var h = hero.heading;
    var fx = Math.sin(h), fz = Math.cos(h);
    var tx = hero.x - fx * 5.5, tz = hero.z - fz * 5.5;
    if (snap) camPos.set(tx, 2.6, tz);
    else {
      var k = 1 - Math.pow(0.0001, dt);
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (2.6 - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;
    }
    camera.position.copy(camPos);
    camera.lookAt(hero.x + fx * 6, 1.4, hero.z + fz * 6);
  }

  function marinaCam(hero, crew, snap) {
    // Frame Javi + the 3 crew with the boats and ocean behind them.
    var tx = 79, ty = 2.4, tz = 164;
    if (snap) camPos.set(tx, ty, tz);
    else {
      var k = 0.08;
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (ty - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;
    }
    camera.position.copy(camPos);
    camera.lookAt(79, 1.4, 181);
  }

  function update(scene, hero, mode, dt, t, snap) {
    if (mode === 'drive') chaseCam(hero, dt, snap);
    else if (mode === 'title') titleCam(t, hero);
    else if (mode === 'onfoot') footCam(hero, dt, snap);
    else if (mode === 'marina') marinaCam(hero, null, snap);
    heroLight.position.set(hero.x, 4.5, hero.z);
    // Sun sprite: hide when it sits behind the camera (it would smear).
    if (sunSprite) {
      var toSun = new THREE.Vector3().copy(sunSprite.position).sub(camera.position).normalize();
      var fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      sunSprite.visible = toSun.dot(fwd) > -0.15;
    }
  }

  function render(scene) { renderer.render(scene, camera); }

  return { init: init, update: update, render: render, camera: function () { return camera; }, renderer: function () { return renderer; } };
})();
