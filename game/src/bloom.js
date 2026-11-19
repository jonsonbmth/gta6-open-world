// Custom bloom composer, authored from scratch for SOLMAR BAY (no vendored
// post-processing). Pipeline: scene -> linear HDR target -> bright pass (HIGH
// threshold, so dim ground reflections never bloom) -> separable gaussian blur
// -> composite (scene + bloom) with an ACES filmic fit and sRGB encode done in
// the composite shader, so tone mapping is applied exactly once, on screen.
//
// The high bright-pass threshold is deliberate: V9's marina shot grew a giant
// translucent wedge when a bright ground reflection fed the bloom pass. Here
// only true light sources (neon, lamps, headlights, sky glow) pass the gate.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = smoothstep(uThreshold, uThreshold + 0.35, l);
  gl_FragColor = vec4(c * w, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDirection;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
  vec2 off1 = uDirection * 1.3846153846;
  vec2 off2 = uDirection * 3.2307692308;
  c += texture2D(tDiffuse, vUv + off1).rgb * 0.3162162162;
  c += texture2D(tDiffuse, vUv - off1).rgb * 0.3162162162;
  c += texture2D(tDiffuse, vUv + off2).rgb * 0.0702702703;
  c += texture2D(tDiffuse, vUv - off2).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}
`;

// ACES fitted curve (Stephen Hill's approximation) + exact sRGB encode.
const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uStrength;
uniform float uExposure;
varying vec2 vUv;
vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 srgb(vec3 c) {
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
void main() {
  vec3 scene = texture2D(tScene, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 hdr = (scene + bloom * uStrength) * uExposure;
  gl_FragColor = vec4(srgb(aces(hdr)), 1.0);
}
`;

function makeTarget(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });
}

function fullscreenQuad(material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  return mesh;
}

export function createBloom(renderer, scene, camera, opts = {}) {
  const threshold = opts.threshold ?? 0.85;
  const strength = opts.strength ?? 0.85;
  const exposure = opts.exposure ?? 1.28;
  const blurRadius = opts.blurRadius ?? 1.0;

  // Bright + blur targets run at HALF resolution: bloom is a blur, so the
  // smaller targets look identical and cost ~4x less in software rendering.
  let w = 2;
  let h = 2;
  let rtScene = makeTarget(2, 2);
  let rtBright = makeTarget(2, 2);
  let rtBlurA = makeTarget(2, 2);
  let rtBlurB = makeTarget(2, 2);

  const brightMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: BRIGHT_FRAG,
    uniforms: { tDiffuse: { value: null }, uThreshold: { value: threshold } },
    depthTest: false,
    depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: { tDiffuse: { value: null }, uDirection: { value: new THREE.Vector2(1, 0) } },
    depthTest: false,
    depthWrite: false,
  });
  const compositeMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      tScene: { value: null },
      tBloom: { value: null },
      uStrength: { value: strength },
      uExposure: { value: exposure },
    },
    depthTest: false,
    depthWrite: false,
  });

  const quad = fullscreenQuad(brightMat);
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function pass(material, input, output) {
    quad.material = material;
    material.uniforms.tDiffuse.value = input.texture;
    renderer.setRenderTarget(output);
    renderer.render(quadScene, quadCam);
  }

  function setSize(width, height) {
    w = Math.max(2, Math.floor(width));
    h = Math.max(2, Math.floor(height));
    rtScene.setSize(w, h);
    const hw = Math.max(2, Math.floor(w / 2));
    const hh = Math.max(2, Math.floor(h / 2));
    for (const rt of [rtBright, rtBlurA, rtBlurB]) rt.setSize(hw, hh);
  }

  function render() {
    renderer.setRenderTarget(rtScene);
    renderer.render(scene, camera);

    pass(brightMat, rtScene, rtBright);

    // Two separable blur iterations, ping-ponging between A and B.
    // (Blur targets are half-res, so directions use half dimensions.)
    blurMat.uniforms.uDirection.value.set((blurRadius * 2) / w, 0);
    pass(blurMat, rtBright, rtBlurA);
    blurMat.uniforms.uDirection.value.set(0, (blurRadius * 2) / h);
    pass(blurMat, rtBlurA, rtBlurB);
    blurMat.uniforms.uDirection.value.set((blurRadius * 3.4) / w, 0);
    pass(blurMat, rtBlurB, rtBlurA);
    blurMat.uniforms.uDirection.value.set(0, (blurRadius * 3.4) / h);
    pass(blurMat, rtBlurA, rtBlurB);

    quad.material = compositeMat;
    compositeMat.uniforms.tScene.value = rtScene.texture;
    compositeMat.uniforms.tBloom.value = rtBlurB.texture;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  return { render, setSize, threshold, strength, exposure };
}
