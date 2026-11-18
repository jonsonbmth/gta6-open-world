// SOLMAR BAY — procedural WebAudio: three radio stations (a tiny step
// sequencer per station), engine hum, police siren, rain noise and SFX.
// No audio files. Everything is guarded: if AudioContext is unavailable or
// suspended, the game runs silent and never throws.
import { RADIO } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.radioIndex = 0;
    this.trackIndex = 0;
    this.radioGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.rainGain = null;
    this.seqTimer = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.started = false;
  }

  /** Call from a user gesture (Enter key / click). Safe to call repeatedly. */
  init() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.34;
      this.radioGain.connect(this.master);
      this._startRain();
      this._startEngine();
      this._startSiren();
      this._startSequencer();
      this.started = true;
    } catch {
      this.ctx = null;
    }
  }

  _noiseBuffer(seconds = 2) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startRain() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.05;
    src.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    src.start();
  }

  _startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  _startSiren() {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  _startSequencer() {
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.seqTimer = window.setInterval(() => this._schedule(), 90);
  }

  _schedule() {
    if (!this.ctx) return;
    const station = RADIO[this.radioIndex];
    const stepDur = 60 / station.bpm / 2; // eighth notes
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      this._playStep(station, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  _tone(freq, time, dur, type, gain, dest) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(g);
    g.connect(dest || this.radioGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  _playStep(station, step, time, stepDur) {
    const scale = station.scale;
    const root = station.root;
    const bar = Math.floor(step / 16);
    // Bass on beats 0 and 8 of each bar, root shifts by bar.
    if (step % 16 === 0 || step % 16 === 8) {
      const deg = [0, 3, 5, 4][bar % 4];
      this._tone(root * Math.pow(2, deg / 12) * 2, time, stepDur * 3.4, 'triangle', 0.5);
    }
    // Chord pad at the top of each bar.
    if (step % 16 === 0) {
      const deg = [0, 3, 5, 4][bar % 4];
      for (const iv of [0, 3, 7]) {
        this._tone(root * 4 * Math.pow(2, (deg + iv) / 12), time, stepDur * 14, 'sawtooth', 0.045);
      }
    }
    // Arpeggio / melody: deterministic pattern from the step index.
    const melodySteps = station.bright ? [2, 5, 7, 10, 12, 14] : [3, 6, 11, 14];
    if (melodySteps.includes(step % 16)) {
      const idx = (step * 7 + bar * 3) % scale.length;
      const oct = station.bright ? 8 : 4;
      this._tone(root * oct * Math.pow(2, scale[idx] / 12), time, stepDur * 1.8, station.bright ? 'square' : 'sine', station.bright ? 0.06 : 0.14);
    }
    // Hats: short noise bursts on off-beats.
    if (step % 2 === 1) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(0.05);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6000;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      src.connect(hp);
      hp.connect(g);
      g.connect(this.radioGain);
      src.start(time);
      src.stop(time + 0.05);
    }
  }

  setStation(index) {
    this.radioIndex = ((index % RADIO.length) + RADIO.length) % RADIO.length;
    this.trackIndex = (this.trackIndex + 1) % RADIO[this.radioIndex].tracks.length;
    this.step = 0;
  }

  currentStation() { return RADIO[this.radioIndex]; }
  currentTrack() { return RADIO[this.radioIndex].tracks[this.trackIndex]; }

  /** Per-frame: engine pitch by speed, siren by wanted level. */
  update(speedKmh, wanted, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.engineGain) {
      const target = driving ? 0.05 + Math.min(0.09, speedKmh / 2400) : 0.0;
      this.engineGain.gain.setTargetAtTime(target, t, 0.1);
      this.engineOsc.frequency.setTargetAtTime(48 + speedKmh * 0.55, t, 0.1);
    }
    if (this.sirenGain) {
      const on = wanted >= 1;
      this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.2);
      if (on) {
        // Two-tone wail alternating ~2.5 Hz.
        const tone = Math.sin(t * Math.PI * 2 * 0.8) > 0 ? 720 : 960;
        this.sirenOsc.frequency.setTargetAtTime(tone, t, 0.05);
      }
    }
  }

  blip(freq = 880, dur = 0.12, gain = 0.15) {
    if (!this.ctx) return;
    this._tone(freq, this.ctx.currentTime, dur, 'sine', gain, this.master);
  }

  nearMiss() {
    this.blip(1180, 0.1, 0.18);
    window.setTimeout(() => this.blip(1560, 0.16, 0.18), 70);
  }

  crash() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.25);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.value = 0.3;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
  }

  missionDone() {
    this.blip(660, 0.14, 0.2);
    window.setTimeout(() => this.blip(880, 0.14, 0.2), 130);
    window.setTimeout(() => this.blip(1320, 0.22, 0.2), 260);
  }
}
