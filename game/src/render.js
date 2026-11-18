// The three.js scene: golden-hour sky, sun with shadows that follow the
// player, fog, and the canvas-painted textures (building facades, roads).
// Everything visual in the game hangs off the scene this module owns.

import * as THREE from 'three';
import { CITY, SKY, SUN } from './config.js';

function facadeTexture(random, base, floors, cols) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const winW = 128 / cols;
  const winH = 256 / floors;
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = random() < 0.35;
      g.fillStyle = lit ? '#ffd98a' : '#2c3a4a';
      g.fillRect(c * winW + 3, f * winH + 4, winW - 6, winH - 8);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(c * winW + 3, f * winH + 4, winW - 6, 3);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 128, 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#3a3f47';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f5d76e';
  g.fillRect(30, 6, 4, 22);
  g.fillRect(30, 38, 4, 22);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(900, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(SKY.top) },
      mid: { value: new THREE.Color(SKY.mid) },
      low: { value: new THREE.Color(SKY.low) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){
        float h = normalize(vP).y;
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.7, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

export function createRenderer(canvas, random) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKY.fog, 180, 700);
  scene.add(makeSky());

  // Sun disc: a glowing billboard low in the west, the postcard of Solmar Bay.
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false, transparent: true, opacity: 0.95 }),
  );
  sunGlow.position.set(-620, 150, 320);
  sunGlow.lookAt(0, 40, 0);
  scene.add(sunGlow);

  const sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
  const sunDir = new THREE.Vector3(
    Math.cos(SUN.elevation) * Math.cos(SUN.azimuth),
    Math.sin(SUN.elevation),
    Math.cos(SUN.elevation) * Math.sin(SUN.azimuth),
  );
  sun.position.copy(sunDir).multiplyScalar(300);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a6a4a, 0.85);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffe0b8, 0.25);
  scene.add(ambient);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2000);

  // Shared geometry and materials: one box, one cylinder, one sphere, reused
  // by every building, car and pedestrian so the scene stays cheap.
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    sph: new THREE.SphereGeometry(0.5, 12, 10),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
  };
  const matCache = new Map();
  function mat(color, opts = {}) {
    const key = `${color}|${opts.emissive ?? ''}|${opts.rough ?? ''}`;
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshLambertMaterial({
        color,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 1,
      }));
    }
    return matCache.get(key);
  }

  const facades = [
    facadeTexture(random, '#d8cfc0', 10, 5),
    facadeTexture(random, '#c4b8a4', 8, 4),
    facadeTexture(random, '#b0c4cc', 12, 6),
    facadeTexture(random, '#d9c1a7', 6, 4),
    facadeTexture(random, '#a8b8a0', 9, 5),
    facadeTexture(random, '#cfd6da', 14, 6),
  ];
  const roadTex = roadTexture();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer, scene, camera, sun, geo, mat, facades, roadTex,
    // Keep the shadow frustum centred on the player so shadows stay crisp.
    followShadows(x, z) {
      sun.position.set(x + sunDir.x * 300, sunDir.y * 300, z + sunDir.z * 300);
      sun.target.position.set(x, 0, z);
    },
    render() { renderer.render(scene, camera); },
  };
}

// A building facade material from one of the shared textures.
export function facadeMaterial(tex) {
  return new THREE.MeshLambertMaterial({ map: tex });
}
export { THREE };
