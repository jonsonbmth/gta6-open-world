// Aurelia Bay — sky, sun and light. Blue daytime sky (the brief is explicit:
// blue, not an all-orange golden hour), a warm sun low enough for long
// readable shadows, a handful of soft billboard clouds, and a light rig the
// whole city shares. The shadow camera follows the player so shadows stay
// crisp where the camera looks.
(function () {
  'use strict';

  var SKY_TOP = 0x2f7fd0;      // deep daytime blue at the zenith
  var SKY_HORIZON = 0xbfe0f2;  // pale blue at the horizon
  var SUN_COLOR = 0xfff1cf;    // warm sunlight
  var SUN_INTENSITY = 2.6;

  function buildSky(scene, rng) {
    // Gradient dome: a big sphere, inside-out, vertex colours from horizon
    // pale to zenith blue. Fog blends the city's far edge into the horizon.
    var geo = new THREE.SphereGeometry(900, 24, 14);
    var colors = [];
    var pos = geo.attributes.position;
    var top = new THREE.Color(SKY_TOP), bot = new THREE.Color(SKY_HORIZON);
    var tmp = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var t = THREE.MathUtils.clamp(pos.getY(i) / 900, 0, 1);
      tmp.copy(bot).lerp(top, Math.pow(t, 0.75));
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    var dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false
    }));
    dome.renderOrder = -10;
    scene.add(dome);

    // Sun disc + glow sprite, high in the west so shadows fall long east.
    var sunGroup = new THREE.Group();
    var disc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc, fog: false, transparent: true, opacity: 0.95 })
    );
    sunGroup.add(disc);
    var glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    var g = glowCanvas.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,244,200,0.9)');
    grad.addColorStop(0.4, 'rgba(255,230,160,0.35)');
    grad.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    var glowTex = new THREE.CanvasTexture(glowCanvas);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, fog: false, depthWrite: false
    }));
    glow.scale.set(220, 220, 1);
    sunGroup.add(glow);
    sunGroup.position.set(-420, 330, -260);
    sunGroup.lookAt(0, 0, 0);
    scene.add(sunGroup);

    // Soft billboard clouds: a few flattened white ellipses drifting slowly.
    var cloudTex = makeCloudTexture();
    var clouds = [];
    for (var c = 0; c < 14; c++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTex, transparent: true, opacity: 0.75 + rng.next() * 0.2,
        fog: false, depthWrite: false
      }));
      var w = 90 + rng.next() * 160;
      s.scale.set(w, w * 0.32, 1);
      s.position.set(rng.range(-700, 700), 260 + rng.next() * 140, rng.range(-700, 700));
      s.userData.drift = 0.6 + rng.next() * 0.9;
      scene.add(s);
      clouds.push(s);
    }

    scene.fog = new THREE.Fog(0xcfe6f2, 260, 820);

    return {
      dome: dome,
      sunGroup: sunGroup,
      clouds: clouds,
      update: function (dt) {
        for (var i = 0; i < clouds.length; i++) {
          var cl = clouds[i];
          cl.position.x += cl.userData.drift * dt;
          if (cl.position.x > 780) cl.position.x = -780;
        }
      }
    };
  }

  function makeCloudTexture() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    var x = c.getContext('2d');
    var rng = window.AB.util.makeRng(99);
    for (var i = 0; i < 22; i++) {
      var px = 40 + rng.next() * 176, py = 45 + rng.next() * 40;
      var r = 14 + rng.next() * 26;
      var g = x.createRadialGradient(px, py, 2, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Sun + hemisphere rig. The shadow camera is a tight box that follows the
  // player: crisp shadows near the action, no wasted resolution on the far city.
  function buildLights(scene) {
    var hemi = new THREE.HemisphereLight(0xbcd9f5, 0x8a7a5f, 1.15);
    scene.add(hemi);

    var sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
    sun.position.set(-90, 130, -60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 420;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.4;
    scene.add(sun);
    scene.add(sun.target);

    // Warm bounce from the low sun side so shadowed facades are not dead.
    var fill = new THREE.DirectionalLight(0xffe0b8, 0.45);
    fill.position.set(80, 40, 90);
    scene.add(fill);

    return {
      sun: sun,
      follow: function (x, z) {
        sun.position.set(x - 90, 130, z - 60);
        sun.target.position.set(x, 0, z);
        sun.target.updateMatrixWorld();
      }
    };
  }

  window.AB.sky = {
    SKY_TOP: SKY_TOP,
    SKY_HORIZON: SKY_HORIZON,
    buildSky: buildSky,
    buildLights: buildLights
  };
})();
