// SOLMAR BAY — custom HDR bloom composer, written from scratch for this game.
// Chain: scene -> HDR target -> bright pass (half res) -> 2x gaussian blur ->
// composite (scene + bloom, ACES filmic tone map, sRGB encode, vignette).
// No three.js examples modules are vendored: every shader here is authored.
// If float render targets are unavailable the composer falls back to LDR targets;
// if the whole chain fails, the game renders direct with the renderer's ACES tone map.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  var VERT = [
    'varying vec2 vUv;',
    'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');

  var BRIGHT_FRAG = [
    'uniform sampler2D tInput;',
    'uniform float uThreshold;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 c = texture2D(tInput, vUv).rgb;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  float k = uThreshold * 0.5;',
    '  float b = smoothstep(uThreshold - k, uThreshold + k, l);',
    '  gl_FragColor = vec4(c * b, 1.0);',
    '}'
  ].join('\n');

  var BLUR_FRAG = [
    'uniform sampler2D tInput;',
    'uniform vec2 uDir;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 px = uDir / vec2(textureSize(tInput, 0));',
    '  vec3 c = texture2D(tInput, vUv).rgb * 0.227027;',
    '  c += texture2D(tInput, vUv + px * 1.384615).rgb * 0.316216;',
    '  c += texture2D(tInput, vUv - px * 1.384615).rgb * 0.316216;',
    '  c += texture2D(tInput, vUv + px * 3.230769).rgb * 0.070270;',
    '  c += texture2D(tInput, vUv - px * 3.230769).rgb * 0.070270;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  var COMPOSITE_FRAG = [
    'uniform sampler2D tScene;',
    'uniform sampler2D tBloom;',
    'uniform float uStrength;',
    'uniform float uExposure;',
    'varying vec2 vUv;',
    'vec3 aces(vec3 x) {',
    '  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);',
    '}',
    'vec3 toSrgb(vec3 c) {',
    '  vec3 lo = c * 12.92;',
    '  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;',
    '  return mix(lo, hi, step(vec3(0.0031308), c));',
    '}',
    'void main() {',
    '  vec3 base = texture2D(tScene, vUv).rgb;',
    '  vec3 glow = texture2D(tBloom, vUv).rgb;',
    '  vec3 c = base + glow * uStrength;',
    '  c *= uExposure;',
    '  c = aces(c);',
    '  c = toSrgb(c);',
    '  float d = distance(vUv, vec2(0.5));',
    '  c *= 1.0 - 0.30 * smoothstep(0.42, 0.95, d);',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  function makeTarget(w, h, type) {
    return new THREE.WebGLRenderTarget(w, h, {
      type: type,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false
    });
  }

  function BloomComposer(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.strength = 0.9;
    this.threshold = 0.72;
    this.exposure = 1.28;
    this.lowPerf = false;
    var gl = renderer.getContext();
    var floatOK = false;
    try {
      floatOK = !!(renderer.capabilities.isWebGL2 && gl.getExtension('EXT_color_buffer_float'));
    } catch (e) { floatOK = false; }
    this.type = floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.floatOK = floatOK;

    var size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.w = Math.max(2, size.x); this.h = Math.max(2, size.y);
    this.rtScene = makeTarget(this.w, this.h, this.type);
    this.rtBright = makeTarget(this.w >> 1, this.h >> 1, this.type);
    this.rtBlurA = makeTarget(this.w >> 1, this.h >> 1, this.type);
    this.rtBlurB = makeTarget(this.w >> 1, this.h >> 1, this.type);

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quadGeo = new THREE.PlaneGeometry(2, 2);
    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BRIGHT_FRAG,
      uniforms: { tInput: { value: null }, uThreshold: { value: this.threshold } },
      depthTest: false, depthWrite: false
    });
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BLUR_FRAG,
      uniforms: { tInput: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } },
      depthTest: false, depthWrite: false
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        uStrength: { value: this.strength }, uExposure: { value: this.exposure }
      },
      depthTest: false, depthWrite: false
    });
    this.quad = new THREE.Mesh(quadGeo, this.brightMat);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
  }

  BloomComposer.prototype.setSize = function (w, h) {
    this.w = Math.max(2, w); this.h = Math.max(2, h);
    this.rtScene.setSize(this.w, this.h);
    this.rtBright.setSize(this.w >> 1, this.h >> 1);
    this.rtBlurA.setSize(this.w >> 1, this.h >> 1);
    this.rtBlurB.setSize(this.w >> 1, this.h >> 1);
  };

  BloomComposer.prototype.pass = function (mat, input, output) {
    this.quad.material = mat;
    mat.uniforms.tInput.value = input.texture;
    this.renderer.setRenderTarget(output);
    this.renderer.render(this.quadScene, this.quadCam);
  };

  BloomComposer.prototype.render = function (scene, camera) {
    var r = this.renderer;
    var prevTone = r.toneMapping;
    r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    // Bright pass at half res.
    this.brightMat.uniforms.uThreshold.value = this.threshold;
    this.pass(this.brightMat, this.rtScene, this.rtBright);
    // Two gaussian iterations (H+V each); one iteration in low-perf mode.
    var iters = this.lowPerf ? 1 : 2;
    var src = this.rtBright;
    for (var i = 0; i < iters; i++) {
      this.blurMat.uniforms.uDir.value.set(1, 0);
      this.pass(this.blurMat, src, this.rtBlurA);
      this.blurMat.uniforms.uDir.value.set(0, 1);
      this.pass(this.blurMat, this.rtBlurA, this.rtBlurB);
      src = this.rtBlurB;
    }
    // Composite to screen.
    this.quad.material = this.compMat;
    this.compMat.uniforms.tScene.value = this.rtScene.texture;
    this.compMat.uniforms.tBloom.value = src.texture;
    this.compMat.uniforms.uStrength.value = this.strength;
    this.compMat.uniforms.uExposure.value = this.exposure;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
    r.toneMapping = prevTone;
  };

  // Render one frame and sample the centre patch luminance (0..1).
  // Used by the playtest to prove the frame is not black.
  BloomComposer.prototype.frameLuminance = function (scene, camera) {
    this.render(scene, camera);
    var gl = this.renderer.getContext();
    var w = 16, h = 16;
    var px = new Uint8Array(w * h * 4);
    var dw = this.renderer.domElement.width, dh = this.renderer.domElement.height;
    try {
      gl.readPixels(Math.floor(dw / 2) - 8, Math.floor(dh / 2) - 8, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    } catch (e) { return -1; }
    var sum = 0;
    for (var i = 0; i < px.length; i += 4) sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    return sum / (w * h) / 255;
  };

  SB.postfx = { BloomComposer: BloomComposer };
})();
