// Procedural sound: engine hum, siren wail, radio sting and UI blips, all
// synthesized with WebAudio oscillators. No audio assets, no network.
// Audio starts only after the first user gesture (browser policy); the
// screenshot shots never need it.

(function () {
  'use strict';

  const AudioSys = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, muted: false, started: false,

    init() {
      if (this.started) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        this.started = true;
      } catch (e) { /* audio unavailable: game stays silent */ }
    },

    startEngine() {
      if (!this.ctx || this.engineOsc) return;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    },

    setEngine(speed01) {
      if (!this.ctx || !this.engineOsc) return;
      const t = this.ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
      this.engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.075, t, 0.08);
    },

    startSiren() {
      if (!this.ctx || this.sirenOsc) return;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain); lfoGain.connect(this.sirenOsc.frequency);
      this.sirenOsc.frequency.value = 880;
      lfo.start();
    },

    setSiren(on) {
      if (!this.ctx || !this.sirenGain) return;
      this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0.0, this.ctx.currentTime, 0.2);
    },

    blip(freq, dur) {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator(), gn = this.ctx.createGain();
      o.type = 'square'; o.frequency.value = freq;
      gn.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.12));
      o.connect(gn); gn.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + (dur || 0.12));
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
      return this.muted;
    },
  };

  VB.audio = AudioSys;
})();
