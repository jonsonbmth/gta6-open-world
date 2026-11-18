// Sound: everything synthesized with WebAudio — engine hum, sirens,
// three procedural radio stations, rain, gunshots. No audio files.
import { S, STATIONS } from './state.js';

let ctx = null, master = null;
let engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
let radioTimer = null, rainNode = null, nextNote = 0, noteIdx = 0;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    // engine: two detuned saws through a lowpass
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
    const engineOsc2 = ctx.createOscillator(); engineOsc2.type = 'square'; engineOsc2.frequency.value = 28;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(lp); engineOsc2.connect(lp); lp.connect(engineGain); engineGain.connect(master);
    engineOsc.start(); engineOsc2.start();
    // siren: triangle that sweeps between two tones
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
    // rain: looped filtered noise
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.4;
    const rainGain = ctx.createGain(); rainGain.gain.value = 0.05;
    src.connect(bp); bp.connect(rainGain); rainGain.connect(master); src.start();
    rainNode = rainGain;
  } catch (e) { /* audio unavailable — the game still plays */ }
}

export function setEngine(rpm01, on) {
  if (!ctx || !engineOsc) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(45 + rpm01 * 130, t, 0.08);
  engineGain.gain.setTargetAtTime(on ? 0.05 + rpm01 * 0.06 : 0, t, 0.1);
}

export function setSiren(on, near) {
  if (!ctx || !sirenOsc) return;
  const t = ctx.currentTime;
  sirenGain.gain.setTargetAtTime(on ? 0.03 + near * 0.05 : 0, t, 0.2);
  if (on) sirenOsc.frequency.setTargetAtTime(Math.sin(t * 4.4) > 0 ? 720 : 540, t, 0.05);
}

// One-shot effects.
export function sfx(kind) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  if (kind === 'shot') {
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.15);
  } else if (kind === 'punch') {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.11);
  } else if (kind === 'crash') {
    const len = ctx.sampleRate * 0.25;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(g); g.connect(master); src.start(t);
  } else if (kind === 'cash') {
    [880, 1174, 1568].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.25);
      o.connect(g); g.connect(master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.3);
    });
  } else if (kind === 'enter') {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.16);
  }
}

// Procedural radio: a looping bass + arp pattern per station, scheduled ahead.
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
export function startRadio() {
  if (!ctx || radioTimer) return;
  nextNote = ctx.currentTime + 0.1; noteIdx = 0;
  radioTimer = setInterval(() => {
    if (!ctx || !S.radioOn || S.mode !== 'playing') return;
    const st = STATIONS[S.radio];
    const beat = 60 / st.bpm / 2;
    while (nextNote < ctx.currentTime + 0.25) {
      const scale = SCALES[st.minor ? 'minor' : 'major'];
      const root = 110;
      const step = noteIdx % 16;
      // bass on 0, 4, 8, 12
      if (step % 4 === 0) playNote(root * Math.pow(2, scale[step === 8 ? 3 : 0] / 12), nextNote, beat * 3, 'triangle', 0.11);
      // arp
      const deg = scale[[0, 2, 4, 6, 4, 2, 5, 3][noteIdx % 8]];
      playNote(root * 4 * Math.pow(2, deg / 12), nextNote, beat * 0.9, 'sine', 0.05);
      // hat
      if (step % 2 === 1) playNote(6000, nextNote, 0.03, 'square', 0.012);
      nextNote += beat; noteIdx++;
    }
  }, 90);
}

function playNote(freq, when, dur, type, vol) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(g); g.connect(master); o.start(when); o.stop(when + dur + 0.05);
}

export function setMuted(m) { if (master) master.gain.value = m ? 0 : 0.5; }
