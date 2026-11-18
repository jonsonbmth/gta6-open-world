// All sound is synthesized with WebAudio: 3 radio stations, engine, siren, rain.
let ctx = null;
let master = null;
let radioNodes = [];
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;
let rainNodes = null;

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Simple looping chord-pad + bass line per station, each in its own key/mode.
const STATION_SCALES = [
  [110, 130.81, 164.81, 196.0], // A minor-ish
  [98, 123.47, 146.83, 174.61], // G minor-ish
  [116.54, 138.59, 174.61, 207.65], // A# minor-ish
];

export function startRadio(station) {
  ensureCtx();
  stopRadio();
  const scale = STATION_SCALES[station % STATION_SCALES.length];
  const padGain = ctx.createGain();
  padGain.gain.value = 0.05;
  padGain.connect(master);
  scale.slice(0, 3).forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = f;
    o.connect(padGain);
    o.start();
    radioNodes.push(o);
  });
  // gentle bass pulse
  const bass = ctx.createOscillator();
  bass.type = 'sawtooth';
  bass.frequency.value = scale[0] / 2;
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.value = 220;
  const bassGain = ctx.createGain();
  bassGain.gain.value = 0.04;
  bass.connect(bassFilter);
  bassFilter.connect(bassGain);
  bassGain.connect(master);
  bass.start();
  radioNodes.push(bass);
  radioNodes.push(padGain, bassGain);
}

export function stopRadio() {
  for (const n of radioNodes) {
    try { n.stop ? n.stop() : n.disconnect(); } catch { /* already stopped */ }
  }
  radioNodes = [];
}

export function startEngine() {
  ensureCtx();
  if (engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0.0;
  engineOsc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);
  engineOsc.start();
}

export function setEngine(speedKmh, throttle) {
  if (!engineOsc || !engineGain) return;
  engineOsc.frequency.value = 50 + speedKmh * 0.9;
  engineGain.gain.value = throttle ? 0.05 + Math.min(0.05, speedKmh / 2000) : 0.02;
}

export function startSiren() {
  ensureCtx();
  if (sirenTimer) return;
  let hi = false;
  sirenTimer = setInterval(() => {
    hi = !hi;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hi ? 960 : 720;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.42);
  }, 420);
}

export function stopSiren() {
  if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
}

export function startRain() {
  ensureCtx();
  if (rainNodes) return;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.value = 0.035;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
  rainNodes = { src, g };
}

export function blip(freq = 880, dur = 0.08, vol = 0.08) {
  try {
    ensureCtx();
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}

export function gunshot() {
  try {
    ensureCtx();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  } catch { /* audio unavailable */ }
}

export function setMuted(muted) {
  if (master) master.gain.value = muted ? 0 : 0.5;
}
