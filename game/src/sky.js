// sky.js — the blue daytime sky for AURELIA BAY. Clear blue zenith fading
// to a pale horizon, a high sun (~47 degrees), a few soft clouds and a
// light blue haze on the horizon. NOT golden hour: the user asked for a
// blue sky ("langit kan bisa biru"), and bright daylight is what makes
// the whole scene read clear and crisp.

(function () {
  'use strict';

  var TOP_COLOR = '#2f7fd0'; // deep blue zenith
  var HORIZON_COLOR = '#d6ecf9'; // pale blue horizon
  var SUN_ELEVATION_DEG = 47;
  var SUN_AZIMUTH_DEG = 38; // sun toward the south-east, ahead-right of the chase camera

  function buildSky(scene, rng) {
    // Gradient dome: a big sphere with a top-to-horizon shader. The dome
    // follows the camera (it is centered on the origin and huge, so the
    // camera never reaches its edge).
    var skyGeo = new THREE.SphereGeometry(420, 24, 16);
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(TOP_COLOR) },
        horizonColor: { value: new THREE.Color(HORIZON_COLOR) },
        offset: { value: 12 },
        exponent: { value: 0.75 },
      },
      vertexShader: [
        'varying vec3 vWorldPosition;',
        'void main() {',
        '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
        '  vWorldPosition = worldPosition.xyz;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 topColor;',
        'uniform vec3 horizonColor;',
        'uniform float offset;',
        'uniform float exponent;',
        'varying vec3 vWorldPosition;',
        'void main() {',
        '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;',
        '  float t = pow(max(h, 0.0), exponent);',
        '  gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);',
        '}',
      ].join('\n'),
    });
    var dome = new THREE.Mesh(skyGeo, skyMat);
    dome.name = 'skyDome';
    scene.add(dome);

    // Sun: a high directional light with shadows. Elevation ~47 deg keeps
    // the shadows short and the street bright, like a clear midday.
    var elev = (SUN_ELEVATION_DEG * Math.PI) / 180;
    var azim = (SUN_AZIMUTH_DEG * Math.PI) / 180;
    var sunDir = new THREE.Vector3(
      Math.sin(azim) * Math.cos(elev),
      Math.sin(elev),
      Math.cos(azim) * Math.cos(elev),
    );
    var sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
    sun.position.copy(sunDir).multiplyScalar(120);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 260;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);

    // Sky/ground bounce: blue from above, warm sand from below.
    var hemi = new THREE.HemisphereLight(0xbcd9ff, 0x8a7a66, 1.15);
    scene.add(hemi);

    // A soft warm fill from the camera side so the hero's rear (facing the
    // chase camera) is never in murky shade.
    var fill = new THREE.DirectionalLight(0xffe8c8, 0.55);
    fill.position.set(-30, 25, 60);
    scene.add(fill);

    // Light blue distance haze.
    scene.fog = new THREE.Fog(0xcfe4f2, 90, 380);

    // A few billboarded clouds, high and spread out. They sit far enough
    // away that the chase camera reads them as sky, not props.
    var cloudTex = window.AB.textures.cloud();
    var clouds = new THREE.Group();
    clouds.name = 'clouds';
    var cloudSpots = [
      [-120, 95, -180, 90], [40, 110, -220, 110], [150, 90, -120, 80],
      [-60, 120, 60, 100], [120, 105, 120, 90], [-160, 100, 40, 85],
      [0, 125, -320, 130], [220, 95, -260, 95],
    ];
    cloudSpots.forEach(function (spot) {
      var mat = new THREE.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
      });
      var sprite = new THREE.Sprite(mat);
      sprite.position.set(spot[0], spot[1], spot[2]);
      sprite.scale.set(spot[3], spot[3] * 0.45, 1);
      clouds.add(sprite);
    });
    scene.add(clouds);

    return {
      sun: sun,
      sunDirection: sunDir,
      info: {
        elevationDeg: SUN_ELEVATION_DEG,
        topColor: TOP_COLOR,
        horizonColor: HORIZON_COLOR,
      },
    };
  }

  window.AB.sky = {
    buildSky: buildSky,
    TOP_COLOR: TOP_COLOR,
    HORIZON_COLOR: HORIZON_COLOR,
    SUN_ELEVATION_DEG: SUN_ELEVATION_DEG,
  };
})();
