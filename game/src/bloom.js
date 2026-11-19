// Post-processing: threshold bloom (half-res blur), vignette, film grain and
// a touch of chromatic aberration — the cinematic finish. ACES tone mapping
// runs in the scene pass; the composite adds bloom on top.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform float threshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(threshold, threshold + 0.25, l);
  gl_FragColor = vec4(c * k, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 direction;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tInput, vUv).rgb * 0.227027;
  vec2 o1 = direction * 1.3846153846;
  vec2 o2 = direction * 3.2307692308;
  c += texture2D(tInput, vUv + o1).rgb * 0.3162162162;
  c += texture2D(tInput, vUv - o1).rgb * 0.3162162162;
  c += texture2D(tInput, vUv + o2).rgb * 0.0702702703;
  c += texture2D(tInput, vUv - o2).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float time;
uniform float bloomStrength;
varying vec2 vUv;
void main() {
  vec2 dir = vUv - 0.5;
  float r2 = dot(dir, dir);
  float ab = 0.0016 * r2 * 4.0;
  vec3 col;
  col.r = texture2D(tScene, vUv + dir * ab).r;
  col.g = texture2D(tScene, vUv).g;
  col.b = texture2D(tScene, vUv - dir * ab).b;
  col += texture2D(tBloom, vUv).rgb * bloomStrength;
  col *= 1.0 - 0.3 * smoothstep(0.35, 0.95, length(dir) * 1.45);
  float n = fract(sin(dot(vUv * (time + 13.7), vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.028;
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeQuad(material) {
  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}

export class PostFX {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.lowRes = false;
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    this.rtScene = new THREE.WebGLRenderTarget(width, height, rtOpts);
    this.rtBright = new THREE.WebGLRenderTarget(width / 2, height / 2, rtOpts);
    this.rtBlur = new THREE.WebGLRenderTarget(width / 2, height / 2, rtOpts);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, threshold: { value: 0.85 } },
      vertexShader: VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tInput: { value: null }, direction: { value: new THREE.Vector2(1, 0) } },
      vertexShader: VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        time: { value: 0 },
        bloomStrength: { value: 0.85 },
      },
      vertexShader: VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.brightQuad = makeQuad(this.brightMat);
    this.blurQuad = makeQuad(this.blurMat);
    this.compQuad = makeQuad(this.compMat);
    this.scene = new THREE.Scene();
    this.time = 0;
  }

  setLowRes(low) {
    this.lowRes = low;
    const w = low ? Math.floor(this.width / 2) : this.width;
    const h = low ? Math.floor(this.height / 2) : this.height;
    this.rtScene.setSize(w, h);
    this.rtBright.setSize(Math.floor(w / 2), Math.floor(h / 2));
    this.rtBlur.setSize(Math.floor(w / 2), Math.floor(h / 2));
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.setLowRes(this.lowRes);
  }

  render(scene, camera, dt) {
    this.time += dt;
    const r = this.renderer;
    // Scene pass (ACES tone mapping applies in the materials).
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    // Bright pass at half resolution.
    this.brightMat.uniforms.tScene.value = this.rtScene.texture;
    this.scene.clear();
    this.scene.add(this.brightQuad);
    r.setRenderTarget(this.rtBright);
    r.render(this.scene, this.cam);
    // Blur horizontal then vertical.
    this.blurMat.uniforms.tInput.value = this.rtBright.texture;
    this.blurMat.uniforms.direction.value.set(1 / this.rtBright.width, 0);
    this.scene.clear();
    this.scene.add(this.blurQuad);
    r.setRenderTarget(this.rtBlur);
    r.render(this.scene, this.cam);
    this.blurMat.uniforms.tInput.value = this.rtBlur.texture;
    this.blurMat.uniforms.direction.value.set(0, 1 / this.rtBright.height);
    r.setRenderTarget(this.rtBright);
    r.render(this.scene, this.cam);
    // Composite to screen.
    this.compMat.uniforms.tScene.value = this.rtScene.texture;
    this.compMat.uniforms.tBloom.value = this.rtBright.texture;
    this.compMat.uniforms.time.value = this.time;
    this.scene.clear();
    this.scene.add(this.compQuad);
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
  }
}
