// SOLMAR BAY — procedural audio: WebAudio only, no assets. Engine hum,
// three generative radio stations, sirens, and UI sound effects.
// Everything is guarded: in headless runs the context may stay suspended.
import { RADIO } from './config.js';

const SCALES = [
  [0, 3, 5, 7, 10], // minor pentatonic (vapor)
  [0, 2, 4, 7, 9], // major pentatonic (FM)
  [0, 3, 5, 8, 10], // soul minor
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.station = 0;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.step = 0;
    this.ready = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.ready = true;
      this.startEngine();
      this.startRadio();
    } catch (e) {
      this.ready = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  startEngine() {
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.engineFilter = filter;
  }

  setEngine(speedKmh, driving) {
    if (!this.engineOsc) return;
    const t = this.ctx.currentTime;
    const f = 45 + Math.min(1, speedKmh / 180) * 130;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(240 + speedKmh * 4, t, 0.1);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + Math.min(0.06, speedKmh / 2400) : 0.0, t, 0.15);
  }

  startRadio() {
    const ctx = this.ctx;
    // Generative sequencer: a soft pad note + a plucked melody note per step.
    const tick = () => {
      if (!this.ctx || this.muted) return;
      const scale = SCALES[this.station % SCALES.length];
      const base = [220, 196, 174.6][this.station % 3];
      const deg = scale[this.step % scale.length] + 12 * Math.floor((this.step % 8) / 4);
      this.pluck(base * Math.pow(2, deg / 12), 0.5, this.step % 8 === 0 ? 0.12 : 0.07);
      if (this.step % 8 === 0) this.pad(base / 2, 2.2, 0.05);
      this.step++;
    };
    this.musicTimer = setInterval(tick, 340);
  }

  pluck(freq, dur, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }

  pad(freq, dur, vol) {
    const ctx = this.ctx;
    for (const det of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(ctx.currentTime + dur + 0.05);
    }
  }

  nextStation() {
    this.station = (this.station + 1) % RADIO.length;
    this.step = 0;
    return RADIO[this.station];
  }

  currentStation() { return RADIO[this.station % RADIO.length]; }

  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      const ctx = this.ctx;
      this.sirenOsc = ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0.035;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenPhase = 0;
      this.sirenTimer = setInterval(() => {
        if (!this.sirenOsc) return;
        this.sirenPhase = 1 - this.sirenPhase;
        this.sirenOsc.frequency.setValueAtTime(this.sirenPhase ? 720 : 540, ctx.currentTime);
      }, 380);
    } else if (!on && this.sirenOsc) {
      clearInterval(this.sirenTimer);
      try { this.sirenOsc.stop(); } catch (e) { /* already stopped */ }
      this.sirenOsc = null;
    }
  }

  blip(freq = 880, dur = 0.12, vol = 0.12) {
    if (!this.ctx) return;
    this.pluck(freq, dur, vol);
  }

  nearMiss() {
    if (!this.ctx) return;
    this.pluck(1320, 0.18, 0.14);
    setTimeout(() => this.pluck(1760, 0.22, 0.12), 90);
  }
}
