// SOLMAR BAY — procedural WebAudio: engine, sirens, rain and three radio stations.
// No audio files: every sound is synthesised, so the game stays fully offline.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  var STATIONS = [
    { name: 'VAPOR 101.3', song: 'Glass Horizon', bpm: 96, root: 55.0, minor: true, wave: 'sawtooth' },
    { name: 'SOLMAR GOLD 88.7', song: 'Palm Static', bpm: 78, root: 65.41, minor: false, wave: 'triangle' },
    { name: 'TIDE FM 94.2', song: 'Night Current', bpm: 122, root: 49.0, minor: true, wave: 'square' }
  ];
  // Pentatonic-ish step tables, one per station feel.
  var PATTERNS = [
    [0, 3, 5, 7, 10, 12, 10, 7],
    [0, 2, 4, 7, 9, 12, 9, 4],
    [0, 0, 7, 10, 12, 10, 7, 3]
  ];

  function AudioSys() {
    this.ctx = null; this.master = null; this.muted = false;
    this.station = 0; this.radioOn = true;
    this.engineOsc = null; this.engineGain = null; this.engineFilter = null;
    this.sirenOsc = null; this.sirenGain = null; this.sirenTimer = 0;
    this.rainSrc = null; this.rainGain = null;
    this.radioTimer = null; this.radioStep = 0; this.nextNoteTime = 0;
  }

  AudioSys.prototype.ensure = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startRain();
      this.startEngine();
      if (this.radioOn) this.startRadio();
      return true;
    } catch (e) { return false; }
  };

  AudioSys.prototype.startRain = function () {
    var ctx = this.ctx, len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
    var g = ctx.createGain(); g.gain.value = 0.05;
    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(this.master);
    src.start();
    this.rainSrc = src; this.rainGain = g;
  };

  AudioSys.prototype.startEngine = function () {
    var ctx = this.ctx;
    this.engineOsc = ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    var osc2 = ctx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = 55.7;
    this.engineFilter = ctx.createBiquadFilter(); this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(this.engineFilter); osc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start(); osc2.start();
    this.engineOsc2 = osc2;
  };

  AudioSys.prototype.setEngine = function (speedNorm, driving) {
    if (!this.ctx || !this.engineOsc) return;
    var f = 48 + speedNorm * 130;
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f * 1.013 + 0.6, this.ctx.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(240 + speedNorm * 900, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedNorm * 0.05 : 0.0, this.ctx.currentTime, 0.1);
  };

  AudioSys.prototype.setSiren = function (on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      var ctx = this.ctx;
      this.sirenOsc = ctx.createOscillator(); this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = ctx.createGain(); this.sirenGain.gain.value = 0.0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenGain.gain.setTargetAtTime(0.035, ctx.currentTime, 0.2);
    } else if (!on && this.sirenOsc) {
      var o = this.sirenOsc, g = this.sirenGain;
      g.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.15);
      var self = this;
      setTimeout(function () { try { o.stop(); } catch (e) {} self.sirenOsc = null; }, 600);
      this.sirenOsc = null;
    }
  };

  AudioSys.prototype.update = function (dt) {
    if (this.sirenOsc) {
      this.sirenTimer += dt;
      var f = (Math.floor(this.sirenTimer / 0.42) % 2 === 0) ? 720 : 960;
      this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
    }
  };

  AudioSys.prototype.startRadio = function () {
    var self = this;
    if (this.radioTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.radioStep = 0;
    this.radioTimer = setInterval(function () { self.scheduleRadio(); }, 90);
  };

  AudioSys.prototype.scheduleRadio = function () {
    if (!this.ctx || !this.radioOn) return;
    var st = STATIONS[this.station];
    var stepDur = 60 / st.bpm / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      this.playRadioStep(st, this.radioStep, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.radioStep = (this.radioStep + 1) % 32;
    }
  };

  AudioSys.prototype.playRadioStep = function (st, step, t, stepDur) {
    var ctx = this.ctx;
    var pat = PATTERNS[this.station];
    var semi = pat[step % 8] + (step >= 16 ? 12 : 0);
    // Bass on beats 0 and 4 of each 8-step bar.
    if (step % 8 === 0 || step % 8 === 4) {
      var b = ctx.createOscillator(); b.type = 'sine';
      b.frequency.value = st.root;
      var bg = ctx.createGain();
      bg.gain.setValueAtTime(0.16, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 3.2);
      b.connect(bg); bg.connect(this.master);
      b.start(t); b.stop(t + stepDur * 3.4);
    }
    // Arp note on most steps.
    if (step % 2 === 0) {
      var o = ctx.createOscillator(); o.type = st.wave;
      o.frequency.value = st.root * 4 * Math.pow(2, semi / 12);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.055, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 1.8);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      o.connect(lp); lp.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + stepDur * 2);
    }
    // Hat tick on odd steps.
    if (step % 2 === 1) {
      var len = Math.floor(ctx.sampleRate * 0.03);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var n = ctx.createBufferSource(); n.buffer = buf;
      var hg = ctx.createGain(); hg.gain.value = 0.05;
      n.connect(hg); hg.connect(this.master);
      n.start(t);
    }
  };

  AudioSys.prototype.nextStation = function () {
    this.station = (this.station + 1) % STATIONS.length;
    this.radioStep = 0;
    return STATIONS[this.station];
  };

  AudioSys.prototype.currentStation = function () { return STATIONS[this.station]; };

  AudioSys.prototype.blip = function (freq) {
    if (!this.ctx) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq || 880;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.14);
  };

  AudioSys.prototype.skid = function () {
    if (!this.ctx) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * 0.25);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var n = ctx.createBufferSource(); n.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900;
    var g = ctx.createGain(); g.gain.value = 0.12;
    n.connect(bp); bp.connect(g); g.connect(this.master);
    n.start(t);
  };

  AudioSys.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  };

  SB.audio = new AudioSys();
  SB.audio.STATIONS = STATIONS;
})();
