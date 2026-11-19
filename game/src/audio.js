// Procedural WebAudio for SOLMAR BAY: engine hum, two-tone siren, rain wash,
// and three radio stations with tiny generative melody loops. Everything is
// synthesized — no audio files, no network. All calls are safe before the
// first user gesture (the context stays suspended until ensure() is called
// from a click or key press) and safe when AudioContext is unavailable.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.station = 0;
    this.stations = [
      { name: 'VAPOR 101.3', song: 'Glass Horizon', scale: [0, 3, 5, 7, 10], tempo: 112, wave: 'sawtooth' },
      { name: 'SOLMAR FM', song: 'Midnight Malecón', scale: [0, 2, 4, 7, 9], tempo: 96, wave: 'triangle' },
      { name: 'NIGHT DRIVE', song: 'Neon Requiem', scale: [0, 3, 7, 10, 12], tempo: 84, wave: 'sine' },
    ];
    this._engine = null;
    this._siren = null;
    this._rain = null;
    this._radioTimer = null;
    this._radioStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this._startRain();
      this._startRadio();
      return true;
    } catch {
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  setStation(i) {
    this.station = ((i % this.stations.length) + this.stations.length) % this.stations.length;
    this._radioStep = 0;
    return this.stations[this.station];
  }

  stationInfo() {
    return this.stations[this.station];
  }

  _startRain() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this._rain = { src, gain };
  }

  _startRadio() {
    if (this._radioTimer) return;
    const tick = () => {
      if (!this.ctx || this.muted) return;
      const st = this.stations[this.station];
      const stepDur = 60 / st.tempo / 2;
      const note = st.scale[this._radioStep % st.scale.length];
      const octave = this._radioStep % 8 >= 6 ? 2 : 1;
      const freq = 220 * Math.pow(2, note / 12) * octave;
      const osc = this.ctx.createOscillator();
      osc.type = st.wave;
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, this.ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + stepDur * 0.9);
      osc.connect(g).connect(this.master);
      osc.start();
      osc.stop(this.ctx.currentTime + stepDur);
      this._radioStep++;
    };
    this._radioTimer = setInterval(tick, 60 / this.stations[this.station].tempo / 2 * 1000);
    // Re-time when the station changes by restarting the interval.
    this._retimeRadio = () => {
      clearInterval(this._radioTimer);
      this._radioTimer = setInterval(tick, 60 / this.stations[this.station].tempo / 2 * 1000);
    };
  }

  setEngine(speed01, on) {
    if (!this.ctx) return;
    if (!on) {
      if (this._engine) {
        try { this._engine.osc.stop(); } catch { /* already stopped */ }
        this._engine = null;
      }
      return;
    }
    if (!this._engine) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      osc.connect(filter).connect(gain).connect(this.master);
      osc.start();
      this._engine = { osc, filter, gain };
    }
    this._engine.osc.frequency.value = 55 + speed01 * 140;
    this._engine.filter.frequency.value = 320 + speed01 * 900;
    this._engine.gain.gain.value = 0.04 + speed01 * 0.05;
  }

  siren(on) {
    if (!this.ctx) return;
    if (!on) {
      if (this._siren) {
        clearInterval(this._siren.timer);
        try { this._siren.osc.stop(); } catch { /* already stopped */ }
        this._siren = null;
      }
      return;
    }
    if (this._siren) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 700;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.018;
    osc.connect(gain).connect(this.master);
    osc.start();
    let hi = false;
    const timer = setInterval(() => {
      hi = !hi;
      osc.frequency.value = hi ? 950 : 700;
    }, 420);
    this._siren = { osc, timer };
  }
}
