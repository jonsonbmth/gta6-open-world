// Procedural WebAudio: three radio stations (synth pads + bass on a beat
// grid), engine hum, siren and UI chimes. Everything is guarded — with no
// AudioContext (headless, no gesture yet) every call is a silent no-op.
import { RADIO } from './config.js';

let ctx = null;
let master = null;
let station = 0;
let muted = false;
let radioTimer = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let beat = 0;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

function note(freq, time, dur, type, vol, dest) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  o.connect(g);
  g.connect(dest || master);
  o.start(time);
  o.stop(time + dur + 0.05);
}

function scheduleRadio() {
  if (!ctx || muted) return;
  const st = RADIO[station];
  const beatLen = 60 / st.bpm;
  const now = ctx.currentTime + 0.05;
  // Pad chord (root + fifth + octave, soft triangle) + bass pulse.
  const chord = [1, 1.5, 2];
  for (const m of chord) note(st.root * m, now, beatLen * 3.8, 'triangle', 0.05);
  note(st.root / 2, now, beatLen * 0.9, 'sine', 0.16);
  if (beat % 2 === 0) note(st.root * 1.25, now + beatLen / 2, beatLen * 0.5, 'sine', 0.06);
  beat += 1;
}

export function startAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (radioTimer) return;
  const st = RADIO[station];
  radioTimer = setInterval(scheduleRadio, (60 / st.bpm) * 1000);
  scheduleRadio();
}

export function setStation(index) {
  station = ((index % RADIO.length) + RADIO.length) % RADIO.length;
  if (radioTimer) {
    clearInterval(radioTimer);
    const st = RADIO[station];
    radioTimer = setInterval(scheduleRadio, (60 / st.bpm) * 1000);
  }
  return RADIO[station];
}

export function getStation() {
  return RADIO[station];
}

export function setMuted(m) {
  muted = m;
  if (master && ctx) master.gain.setValueAtTime(m ? 0 : 0.5, ctx.currentTime);
}

export function isMuted() {
  return muted;
}

export function startEngine() {
  if (!ensure() || engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0.0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  engineOsc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);
  engineOsc.start();
}

export function setEngineSpeed(kmh, inCar) {
  if (!engineOsc || !ctx) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(50 + kmh * 0.9, t, 0.1);
  engineGain.gain.setTargetAtTime(inCar ? 0.05 + Math.min(0.06, kmh * 0.0004) : 0.0, t, 0.1);
}

export function startSiren() {
  if (!ensure() || sirenOsc) return;
  sirenOsc = ctx.createOscillator();
  sirenOsc.type = 'sine';
  sirenGain = ctx.createGain();
  sirenGain.gain.value = 0.0;
  sirenOsc.connect(sirenGain);
  sirenGain.connect(master);
  sirenOsc.start();
  let hi = false;
  sirenOsc._flip = setInterval(() => {
    if (!sirenOsc) return;
    hi = !hi;
    sirenOsc.frequency.setTargetAtTime(hi ? 880 : 660, ctx.currentTime, 0.05);
  }, 450);
}

export function setSirenLevel(wanted) {
  if (!sirenGain || !ctx) return;
  sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.035 : 0.0, ctx.currentTime, 0.2);
}

export function nearMissChime() {
  if (!ensure()) return;
  const now = ctx.currentTime;
  note(880, now, 0.18, 'sine', 0.12);
  note(1318, now + 0.09, 0.22, 'sine', 0.1);
}

export function clickSound() {
  if (!ensure()) return;
  note(660, ctx.currentTime, 0.07, 'square', 0.06);
}
