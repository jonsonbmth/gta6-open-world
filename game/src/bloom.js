// SOLMAR BAY — cinematic post-processing, written from scratch (no vendored
// post-processing modules): bright-pass bloom at half resolution (high
// threshold so ground reflections never bloom into artifacts), plus a final
// composite with vignette, subtle film grain and slight chromatic aberration.
// ACES tone mapping happens in the renderer, before this pass.
import * as THREE from 'three';

const QUAD_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`;

const BRIGHT_FRAG = `
  uniform sampler2D tDiffuse;
  uniform float threshold;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(tDiffuse, vUv);
    float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(threshold, threshold + 0.25, l);
    gl_FragColor = vec4(c.rgb * k, 1.0);
  }`;

const BLUR_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 direction;
  varying vec2 vUv;
  void main() {
    vec4 sum = vec4(0.0);
    sum += texture2D(tDiffuse, vUv - direction * 4.0) * 0.05;
    sum += texture2D(tDiffuse, vUv - direction * 3.0) * 0.09;
    sum += texture2D(tDiffuse, vUv - direction * 2.0) * 0.12;
    sum += texture2D(tDiffuse, vUv - direction * 1.0) * 0.15;
    sum += texture2D(tDiffuse, vUv) * 0.18;
    sum += texture2D(tDiffuse, vUv + direction * 1.0) * 0.15;
    sum += texture2D(tDiffuse, vUv + direction * 2.0) * 0.12;
    sum += texture2D(tDiffuse, vUv + direction * 3.0) * 0.09;
    sum += texture2D(tDiffuse, vUv + direction * 4.0) * 0.05;
    gl_FragColor = sum;
  }`;

const COMPOSITE_FRAG = `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float time;
  uniform float bloomStrength;
  varying vec2 vUv;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    vec2 d = vUv - 0.5;
    float r2 = dot(d, d);
    // Slight chromatic aberration, growing toward the edges.
    float ca = 0.0016 * (0.4 + r2 * 3.0);
    vec3 col;
    col.r = texture2D(tScene, vUv + d * ca).r;
    col.g = texture2D(tScene, vUv).g;
    col.b = texture2D(tScene, vUv - d * ca).b;
    vec3 bloom = texture2D(tBloom, vUv).rgb;
    col += bloom * bloomStrength;
    // Vignette.
    col *= 1.0 - r2 * 0.42;
    // Subtle film grain.
    float grain = hash(vUv * (time + 13.7)) - 0.5;
    col += grain * 0.028;
    gl_FragColor = vec4(col, 1.0);
  }`;

function makePass(material) {
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);
  return { scene, cam };
}

export class PostFX {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.enabled = true;
    this.bloomStrength = 0.85;
    this.threshold = 0.95; // HIGH — only true emissives bloom, never sunlit paint
    this.width = width;
    this.height = height;

    this.sceneRT = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
    const hw = Math.max(2, Math.floor(width / 2));
    const hh = Math.max(2, Math.floor(height / 2));
    this.bloomRT = new THREE.WebGLRenderTarget(hw, hh, { type: THREE.HalfFloatType });
    this.blurRT = new THREE.WebGLRenderTarget(hw, hh, { type: THREE.HalfFloatType });

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, threshold: { value: this.threshold } },
      vertexShader: QUAD_VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false,
    });
    this.blurMatH = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(1 / hw, 0) } },
      vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false,
    });
    this.blurMatV = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(0, 1 / hh) } },
      vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        time: { value: 0 }, bloomStrength: { value: this.bloomStrength },
      },
      vertexShader: QUAD_VERT, fragmentShader: COMPOSITE_FRAG, depthTest: false, depthWrite: false,
    });
    this.brightPass = makePass(this.brightMat);
    this.blurPassH = makePass(this.blurMatH);
    this.blurPassV = makePass(this.blurMatV);
    this.compPass = makePass(this.compMat);
  }

  setSize(width, height) {
    this.width = width; this.height = height;
    this.sceneRT.setSize(width, height);
    const hw = Math.max(2, Math.floor(width / 2));
    const hh = Math.max(2, Math.floor(height / 2));
    this.bloomRT.setSize(hw, hh);
    this.blurRT.setSize(hw, hh);
    this.blurMatH.uniforms.direction.value.set(1 / hw, 0);
    this.blurMatV.uniforms.direction.value.set(0, 1 / hh);
  }

  render(scene, camera, time) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    // 1. Scene to target.
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    // 2. Bright pass at half res.
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    r.setRenderTarget(this.bloomRT);
    r.render(this.brightPass.scene, this.brightPass.cam);
    // 3. Blur H then V.
    this.blurMatH.uniforms.tDiffuse.value = this.bloomRT.texture;
    r.setRenderTarget(this.blurRT);
    r.render(this.blurPassH.scene, this.blurPassH.cam);
    this.blurMatV.uniforms.tDiffuse.value = this.blurRT.texture;
    r.setRenderTarget(this.bloomRT);
    r.render(this.blurPassV.scene, this.blurPassV.cam);
    // 4. Composite to screen.
    this.compMat.uniforms.tScene.value = this.sceneRT.texture;
    this.compMat.uniforms.tBloom.value = this.bloomRT.texture;
    this.compMat.uniforms.time.value = time;
    r.setRenderTarget(null);
    r.render(this.compPass.scene, this.compPass.cam);
  }
}
