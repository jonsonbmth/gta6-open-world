// All sound is synthesized live with WebAudio — no audio files, nothing to
// download. Three radio stations, each a looping chord-and-bass pattern at its
// own tempo, plus engine hum, sirens and one-shot effects.

import { RADIO } from './config.js';

const CHORDS = [
  [220.0, 261.6, 329.6, 392.0],
  [174.6, 220.0, 261.6, 349.2],
  [196.0, 246.9, 293.7, 392.0],
  [146.8, 196.0, 246.9, 293.7],
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let station = 0;
  let radioOn = false;
  let radioTimer = null;
  let chordIndex = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      radioGain = ctx.createGain();
      radioGain.gain.value = 0;
      radioGain.connect(master);
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc.connect(engineGain);
      engineOsc.start();
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenGain.connect(master);
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 750;
      sirenOsc.connect(sirenGain);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function playChord(freqs, when, length) {
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.05, when + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, when + length);
      osc.connect(g);
      g.connect(radioGain);
      osc.start(when);
      osc.stop(when + length + 0.05);
    }
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = freqs[0] / 2;
    bg.gain.setValueAtTime(0.09, when);
    bg.gain.exponentialRampToValueAtTime(0.0001, when + length);
    bass.connect(bg);
    bg.connect(radioGain);
    bass.start(when);
    bass.stop(when + length + 0.05);
  }

  function scheduleRadio() {
    if (!radioOn || !ctx) return;
    const bpm = RADIO[station].bpm;
    const bar = (60 / bpm) * 4;
    const now = ctx.currentTime + 0.05;
    playChord(CHORDS[chordIndex % CHORDS.length], now, bar);
    chordIndex += 1;
    radioTimer = window.setTimeout(scheduleRadio, bar * 1000);
  }

  function blip(freq, duration, type, volume, slideTo) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') void ctx.resume(); },
    setStation(index) {
      station = ((index % RADIO.length) + RADIO.length) % RADIO.length;
      chordIndex = 0;
      return RADIO[station];
    },
    station() { return RADIO[station]; },
    radio(on) {
      radioOn = on;
      if (!ensure()) return;
      if (radioTimer) window.clearTimeout(radioTimer);
      radioTimer = null;
      if (on) {
        radioGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.4);
        scheduleRadio();
      } else {
        radioGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      }
    },
    engine(speed01, on) {
      if (!ctx) return;
      engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(45 + speed01 * 130, ctx.currentTime, 0.08);
    },
    siren(on) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, ctx.currentTime, 0.2);
      if (on) {
        const t = ctx.currentTime;
        sirenOsc.frequency.setValueAtTime(700, t);
        sirenOsc.frequency.linearRampToValueAtTime(950, t + 0.45);
        sirenOsc.frequency.linearRampToValueAtTime(700, t + 0.9);
      }
    },
    shot() { blip(220, 0.14, 'square', 0.16, 60); },
    punch() { blip(140, 0.1, 'sine', 0.2, 70); },
    pickup() { blip(660, 0.12, 'sine', 0.15); window.setTimeout(() => blip(880, 0.16, 'sine', 0.15), 90); },
    complete() {
      [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.16), i * 110));
    },
    busted() { [392, 330, 262].forEach((f, i) => window.setTimeout(() => blip(f, 0.3, 'sawtooth', 0.1), i * 180)); },
    crash() { blip(90, 0.25, 'sawtooth', 0.22, 40); },
  };
}
