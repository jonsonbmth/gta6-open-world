// All sound is synthesized with WebAudio — no audio assets, fully offline.
// Three radio stations (procedural loops), engine hum, siren, rain, UI blips.

import { RADIO } from './config.js';

const SCALES = {
  synthwave: [0, 3, 5, 7, 10, 12, 15],
  latin: [0, 2, 4, 5, 7, 9, 11],
  lofi: [0, 3, 5, 7, 10, 12],
};
const TEMPO = { synthwave: 132, latin: 168, lofi: 84 };

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.station = 0;
    this.muted = false;
    this._radioTimer = 0;
    this._step = 0;
    this._engineOsc = null;
    this._engineGain = null;
    this._sirenOsc = null;
    this._sirenGain = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._startRain();
      this._startEngine();
      this._startSiren();
    } catch (e) { this.ctx = null; }
  }

  _startRain() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28; // low-passed = rain patter
      data[i] = last * 0.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0.10;
    src.connect(g).connect(this.master);
    src.start();
  }

  _startEngine() {
    this._engineOsc = this.ctx.createOscillator();
    this._engineOsc.type = 'sawtooth';
    this._engineOsc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this._engineGain = this.ctx.createGain();
    this._engineGain.gain.value = 0;
    this._engineOsc.connect(filter).connect(this._engineGain).connect(this.master);
    this._engineOsc.start();
    this._engineFilter = filter;
  }

  _startSiren() {
    this._sirenOsc = this.ctx.createOscillator();
    this._sirenOsc.type = 'triangle';
    this._sirenOsc.frequency.value = 700;
    this._sirenGain = this.ctx.createGain();
    this._sirenGain.gain.value = 0;
    this._sirenOsc.connect(this._sirenGain).connect(this.master);
    this._sirenOsc.start();
  }

  setEngine(speed, inCar) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const target = inCar ? 0.05 + Math.min(0.09, Math.abs(speed) * 0.0016) : 0;
    this._engineGain.gain.setTargetAtTime(target, t, 0.1);
    this._engineOsc.frequency.setTargetAtTime(48 + Math.abs(speed) * 2.4, t, 0.08);
    this._engineFilter.frequency.setTargetAtTime(280 + Math.abs(speed) * 14, t, 0.1);
  }

  setSiren(wanted) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.035 : 0, t, 0.3);
    if (wanted > 0) {
      const f = 640 + 160 * Math.sin(t * 4.4);
      this._sirenOsc.frequency.setTargetAtTime(f, t, 0.05);
    }
  }

  setStation(i) {
    this.station = ((i % RADIO.length) + RADIO.length) % RADIO.length;
    this._step = 0;
  }

  get stationInfo() {
    const st = RADIO[this.station];
    return { name: st.name, song: st.songs[this._step % st.songs.length] };
  }

  // Call every frame: schedules the radio arpeggio.
  update(dt) {
    if (!this.ctx || this.muted) return;
    const st = RADIO[this.station];
    const scale = SCALES[st.genre];
    const stepDur = 60 / TEMPO[st.genre] / 2;
    this._radioTimer += dt;
    while (this._radioTimer >= stepDur) {
      this._radioTimer -= stepDur;
      this._step++;
      const note = scale[this._step % scale.length];
      const freq = 220 * Math.pow(2, note / 12);
      const osc = this.ctx.createOscillator();
      osc.type = st.genre === 'lofi' ? 'sine' : 'square';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 0.95);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + stepDur);
      // soft bass on every 4th step
      if (this._step % 4 === 0) {
        const bass = this.ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = freq / 4;
        const bg = this.ctx.createGain();
        bg.gain.setValueAtTime(0.0001, t);
        bg.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
        bg.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 3.6);
        bass.connect(bg).connect(this.master);
        bass.start(t);
        bass.stop(t + stepDur * 4);
      }
    }
  }

  blip(freq = 880, dur = 0.12, vol = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  cash() { this.blip(1320, 0.1, 0.1); setTimeout(() => this.blip(1760, 0.16, 0.1), 90); }
}
