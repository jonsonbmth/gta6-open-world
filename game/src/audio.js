// Synthesised sound: engine hum, police siren, UI chimes — all WebAudio
// oscillators, no audio files. Starts on first user gesture; safe to call
// before the context exists.
let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // engine: low sawtooth + sub sine, gain follows speed
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    // siren: two-tone triangle, quiet
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 750;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.015;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
  } catch (e) {
    ctx = null;
  }
}

export function setEngine(speedKmh, driving) {
  if (!ctx || !engineOsc) return;
  const f = 50 + Math.min(speedKmh, 160) * 0.9;
  engineOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.1);
  engineGain.gain.setTargetAtTime(driving ? 0.05 + Math.min(speedKmh, 160) * 0.0004 : 0, ctx.currentTime, 0.2);
}

export function setSiren(on) {
  if (!ctx || !sirenGain) return;
  sirenGain.gain.setTargetAtTime(on ? 0.015 : 0, ctx.currentTime, 0.3);
}

export function sirenWail(t) {
  if (!ctx || !sirenOsc) return;
  sirenOsc.frequency.setTargetAtTime(750 + Math.sin(t * 4) * 180, ctx.currentTime, 0.05);
}

export function chime() {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(ctx.currentTime + 0.4);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
