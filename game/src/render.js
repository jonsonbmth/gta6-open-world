// The three.js scene: golden-hour sky with sun glow and clouds, a low sun
// with shadows that follow the player, fog, and canvas-painted textures
// (building facades with lit windows, roads). Everything visual in the game
// hangs off the scene this module owns.

import * as THREE from 'three';
import { CITY, SKY, SUN } from './config.js';

// A facade texture pair: the colour map (base + every window) and an
// emissive map (only the lit windows, warm yellow) so buildings glow from
// the inside at sunset instead of looking like flat cardboard.
function facadeTexture(random, base, floors, cols) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const glow = document.createElement('canvas');
  glow.width = 128;
  glow.height = 256;
  const e = glow.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  e.fillStyle = '#000000';
  e.fillRect(0, 0, 128, 256);
  // A subtle vertical shade so the facade is not one flat colour.
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.22)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  const litChance = 0.28 + random() * 0.25;
  const winW = 128 / cols;
  const winH = 256 / floors;
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = random() < litChance;
      const x = c * winW + 3;
      const y = f * winH + 4;
      const w = winW - 6;
      const h = winH - 8;
      g.fillStyle = lit ? '#ffd98a' : '#202c3a';
      g.fillRect(x, y, w, h);
      // Glass shine on the top edge of every window.
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fillRect(x, y, w, 3);
      if (lit) {
        e.fillStyle = '#ffc46b';
        e.fillRect(x, y, w, h);
      }
    }
  }
  // Dark parapet strip at the top, gold trim band at the base: pastel
  // buildings with yellow trim, the Solmar Bay colour script.
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(0, 0, 128, 8);
  g.fillStyle = '#ffd166';
  g.fillRect(0, 8, 128, 4);
  g.fillStyle = 'rgba(255,209,102,0.85)';
  g.fillRect(0, 246, 128, 10);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(glow);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function roadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#33373e';
  g.fillRect(0, 0, 64, 64);
  // Speckled asphalt so the road is not a flat slab.
  for (let i = 0; i < 90; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  // Dashed centre line + white edge lines.
  g.fillStyle = '#f5d76e';
  g.fillRect(30, 6, 4, 22);
  g.fillRect(30, 38, 4, 22);
  g.fillStyle = 'rgba(240,240,240,0.75)';
  g.fillRect(2, 0, 2, 64);
  g.fillRect(60, 0, 2, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Soft radial-gradient sprite texture (sun glow, clouds).
function glowTexture(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 50, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, outer);
  grad.addColorStop(1, 'rgba(255,120,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A long soft cloud puff: an ellipse of several overlapping gradients.
function cloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  for (const [cx, cy, r] of [[70, 78, 46], [128, 62, 58], [190, 80, 44], [105, 88, 40], [160, 92, 38]]) {
    const grad = g.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
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
  scene.fog = new THREE.Fog(SKY.fog, 170, 680);
  scene.add(makeSky());

  // The sun itself is one soft radial glow sprite: a hard disc plus a
  // co-located billboard split the sun in two at oblique angles (the disc's
  // tilted plane crosses the sprite's plane), so the sprite IS the sun now.
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,230,170,0.95)', 'rgba(255,150,70,0.55)'),
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.9,
  }));
  glowSprite.position.set(-620, 150, 320);
  glowSprite.scale.set(320, 320, 1);
  scene.add(glowSprite);

  // Sunset clouds: soft pink-orange puffs drifting high over the city —
  // kept clear of the sun itself, so no cloud half-covers the disc.
  const cloudTex = cloudTexture();
  const cloudTints = [0xffc4a0, 0xff9e8a, 0xf7d9c0, 0xffb48a];
  const sunAngle = Math.atan2(Math.sin(SUN.azimuth), Math.cos(SUN.azimuth));
  for (let i = 0; i < 14; i += 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex,
      color: cloudTints[Math.floor(random() * cloudTints.length)],
      transparent: true, opacity: 0.45 + random() * 0.3, fog: false, depthWrite: false,
    }));
    let ang = random() * Math.PI * 2;
    // Re-roll if the cloud would sit in front of the sun (a close cloud can
    // cover the disc even from a fair angle away, so keep a wide berth).
    let guard = 0;
    while (Math.abs(((ang - sunAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.0 && guard < 8) {
      ang = random() * Math.PI * 2;
      guard += 1;
    }
    const rad = 280 + random() * 420;
    s.position.set(Math.cos(ang) * rad, 130 + random() * 110, Math.sin(ang) * rad);
    s.scale.set(150 + random() * 160, 45 + random() * 45, 1);
    scene.add(s);
  }

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
    facadeTexture(random, '#f2b8c6', 10, 5),
    facadeTexture(random, '#f7c9a0', 8, 4),
    facadeTexture(random, '#a8d8c8', 12, 6),
    facadeTexture(random, '#c8b8e8', 6, 4),
    facadeTexture(random, '#f2d8a0', 9, 5),
    facadeTexture(random, '#9ec8e8', 14, 6),
    facadeTexture(random, '#f2a899', 9, 5),
    facadeTexture(random, '#b8d8a0', 11, 5),
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

// A building facade material from one of the shared textures: the colour map
// plus the lit-window emissive map, so windows glow warm at sunset.
export function facadeMaterial(pair) {
  if (pair && pair.emissive) {
    return new THREE.MeshLambertMaterial({
      map: pair.map,
      emissive: 0xffb45e,
      emissiveIntensity: 0.6,
      emissiveMap: pair.emissive,
    });
  }
  return new THREE.MeshLambertMaterial({ map: pair });
}
export { THREE };
