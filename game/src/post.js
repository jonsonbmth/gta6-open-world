// Custom post-processing, authored here (no vendored post library): a bright-pass
// + two-pass gaussian bloom at half resolution, then one composite pass that adds
// the bloom, applies ACES filmic tone mapping with exposure, encodes sRGB, and
// adds vignette, film grain and a subtle chromatic aberration.
//
// The scene renders HDR-linear into a render target (three.js only tone-maps the
// default framebuffer, so nothing is double-applied); this pass owns the look.
import * as THREE from 'three';

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = smoothstep(uThreshold, uThreshold + 0.25, l);
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

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uTime;
varying vec2 vUv;

// ACES fitted approximation (Narkowicz).
vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  // Chromatic aberration: tiny radial offset, stronger toward the edges.
  vec2 dir = uv - 0.5;
  float r2 = dot(dir, dir);
  float ab = r2 * 0.0035;
  vec3 scene;
  scene.r = texture2D(tScene, uv + dir * ab).r;
  scene.g = texture2D(tScene, uv).g;
  scene.b = texture2D(tScene, uv - dir * ab).b;
  vec3 bloom = texture2D(tBloom, uv).rgb;
  vec3 color = scene + bloom * uBloomStrength;
  color = aces(color * uExposure);
  // sRGB encode.
  color = pow(color, vec3(1.0 / 2.2));
  // Vignette.
  color *= 1.0 - r2 * 0.42;
  // Film grain.
  float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 61.7);
  color += (g - 0.5) * 0.028;
  gl_FragColor = vec4(color, 1.0);
}
`;

function makeTarget(w, h, samples = 0) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    samples,
    depthBuffer: true,
  });
}

export function createPost(renderer, width, height) {
  let w = width;
  let h = height;
  const sceneTarget = makeTarget(w, h, 0);
  const bloomA = makeTarget(Math.max(2, w >> 1), Math.max(2, h >> 1));
  const bloomB = makeTarget(Math.max(2, w >> 1), Math.max(2, h >> 1));

  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const brightMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: BRIGHT_FRAG,
    uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.85 } },
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: { tDiffuse: { value: null }, uDirection: { value: new THREE.Vector2(1, 0) } },
    depthTest: false, depthWrite: false,
  });
  const compositeMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      tScene: { value: null },
      tBloom: { value: null },
      uExposure: { value: 1.28 },
      uBloomStrength: { value: 0.55 },
      uTime: { value: 0 },
    },
    depthTest: false, depthWrite: false,
  });

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCamera);
  }

  return {
    render(scene, camera, time) {
      renderer.setRenderTarget(sceneTarget);
      renderer.render(scene, camera);
      // Bright pass at half res, then two blur iterations for a soft glow.
      brightMat.uniforms.tDiffuse.value = sceneTarget.texture;
      pass(brightMat, bloomA);
      const texel = new THREE.Vector2(1 / bloomA.width, 1 / bloomA.height);
      for (let i = 0; i < 2; i += 1) {
        blurMat.uniforms.tDiffuse.value = bloomA.texture;
        blurMat.uniforms.uDirection.value.set(texel.x, 0);
        pass(blurMat, bloomB);
        blurMat.uniforms.tDiffuse.value = bloomB.texture;
        blurMat.uniforms.uDirection.value.set(0, texel.y);
        pass(blurMat, bloomA);
      }
      compositeMat.uniforms.tScene.value = sceneTarget.texture;
      compositeMat.uniforms.tBloom.value = bloomA.texture;
      compositeMat.uniforms.uTime.value = time;
      pass(compositeMat, null);
    },
    setSize(newWidth, newHeight) {
      w = newWidth;
      h = newHeight;
      sceneTarget.setSize(w, h);
      bloomA.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
      bloomB.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    },
    setExposure(value) {
      compositeMat.uniforms.uExposure.value = value;
    },
    dispose() {
      sceneTarget.dispose();
      bloomA.dispose();
      bloomB.dispose();
    },
  };
}
