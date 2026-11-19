// SOLMAR BAY — sound, all synthesized with WebAudio. No audio files, no
// network: engine hum, sirens, rain noise, and three procedural radio
// stations (step-sequenced synth lines).
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;

  var A = {
    ctx: null,
    master: null,
    started: false,
    muted: false,
    station: 0,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    radioTimer: null,
    radioStep: 0,
  };

  // Station patterns: [bass notes] + [arp notes], semitone offsets from A2.
  var PATTERNS = [
    { bass: [0, 0, 7, 0, 10, 0, 7, 5], arp: [12, 15, 19, 24, 19, 15, 12, 7], wave: 'sawtooth', cutoff: 900 },
    { bass: [0, 3, 5, 7, 5, 3, 0, 0], arp: [12, 16, 19, 16, 12, 9, 7, 9], wave: 'triangle', cutoff: 1400 },
    { bass: [0, 0, 0, 3, 0, 0, 5, 3], arp: [24, 24, 19, 24, 22, 19, 17, 19], wave: 'square', cutoff: 700 },
  ];

  function noteFreq(semitone) {
    return 110 * Math.pow(2, semitone / 12);
  }

  A.init = function () {
    if (A.started) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.5;
      A.master.connect(A.ctx.destination);
      A.started = true;
      A.startRain();
      A.startEngine();
      A.startRadio();
    } catch (e) {
      // Audio is a garnish: the game must never fail without it.
      A.started = false;
    }
  };

  A.resume = function () {
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };

  // Looping rain: white noise through a lowpass filter.
  A.startRain = function () {
    if (!A.ctx) return;
    var len = A.ctx.sampleRate * 2;
    var buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = A.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var filter = A.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    var gain = A.ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(A.master);
    src.start();
  };

  A.startEngine = function () {
    if (!A.ctx) return;
    A.engineOsc = A.ctx.createOscillator();
    A.engineOsc.type = 'sawtooth';
    A.engineOsc.frequency.value = 55;
    var filter = A.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    A.engineGain = A.ctx.createGain();
    A.engineGain.gain.value = 0;
    A.engineOsc.connect(filter);
    filter.connect(A.engineGain);
    A.engineGain.connect(A.master);
    A.engineOsc.start();
    A.engineFilter = filter;
  };

  A.setEngine = function (speed, inCar) {
    if (!A.engineOsc || !A.ctx) return;
    var t = A.ctx.currentTime;
    var target = inCar ? 0.05 + Math.abs(speed) * 0.0012 : 0;
    A.engineGain.gain.setTargetAtTime(A.muted ? 0 : target, t, 0.1);
    A.engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 1.6, t, 0.08);
    A.engineFilter.frequency.setTargetAtTime(280 + Math.abs(speed) * 14, t, 0.1);
  };

  // Two-tone siren while wanted.
  A.setSiren = function (on) {
    if (!A.ctx) return;
    if (on && !A.sirenOsc) {
      A.sirenOsc = A.ctx.createOscillator();
      A.sirenOsc.type = 'triangle';
      A.sirenGain = A.ctx.createGain();
      A.sirenGain.gain.value = A.muted ? 0 : 0.035;
      A.sirenOsc.connect(A.sirenGain);
      A.sirenGain.connect(A.master);
      A.sirenOsc.start();
      A.sirenPhase = 0;
    } else if (!on && A.sirenOsc) {
      try { A.sirenOsc.stop(); } catch (e) { /* already stopped */ }
      A.sirenOsc = null;
    }
  };

  A.updateSiren = function (time) {
    if (A.sirenOsc && A.ctx) {
      var f = Math.floor(time * 2.4) % 2 === 0 ? 720 : 960;
      A.sirenOsc.frequency.setTargetAtTime(f, A.ctx.currentTime, 0.03);
    }
  };

  // Radio: a step sequencer, one step per 16th note at the station BPM.
  A.startRadio = function () {
    if (!A.ctx || A.radioTimer) return;
    var stepDur = function () {
      return 60 / C.radio[A.station].bpm / 4;
    };
    var tick = function () {
      if (!A.ctx || A.muted) { A.radioStep++; return; }
      var pat = PATTERNS[A.station];
      var step = A.radioStep % 8;
      var t = A.ctx.currentTime;
      // Bass on every step.
      var bass = A.ctx.createOscillator();
      bass.type = pat.wave;
      bass.frequency.value = noteFreq(pat.bass[step]);
      var bg = A.ctx.createGain();
      bg.gain.setValueAtTime(0.09, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + stepDur() * 0.9);
      var bf = A.ctx.createBiquadFilter();
      bf.type = 'lowpass';
      bf.frequency.value = pat.cutoff;
      bass.connect(bf);
      bf.connect(bg);
      bg.connect(A.master);
      bass.start(t);
      bass.stop(t + stepDur());
      // Arp on even steps.
      if (step % 2 === 0) {
        var arp = A.ctx.createOscillator();
        arp.type = 'sine';
        arp.frequency.value = noteFreq(pat.arp[step]);
        var ag = A.ctx.createGain();
        ag.gain.setValueAtTime(0.05, t);
        ag.gain.exponentialRampToValueAtTime(0.001, t + stepDur() * 1.8);
        arp.connect(ag);
        ag.connect(A.master);
        arp.start(t);
        arp.stop(t + stepDur() * 2);
      }
      A.radioStep++;
    };
    A.radioTimer = setInterval(tick, stepDur() * 1000);
  };

  A.nextStation = function () {
    A.station = (A.station + 1) % C.radio.length;
    if (A.radioTimer) {
      clearInterval(A.radioTimer);
      A.radioTimer = null;
      A.radioStep = 0;
      A.startRadio();
    }
    return C.radio[A.station];
  };

  A.stationName = function () {
    return C.radio[A.station].name + ' - ' + C.radio[A.station].dj;
  };

  A.blip = function (freq) {
    if (!A.ctx || A.muted) return;
    var t = A.ctx.currentTime;
    var o = A.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq || 880;
    var g = A.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g);
    g.connect(A.master);
    o.start(t);
    o.stop(t + 0.14);
  };

  A.crash = function (strength) {
    if (!A.ctx || A.muted) return;
    var t = A.ctx.currentTime;
    var len = A.ctx.sampleRate * 0.18;
    var buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = A.ctx.createBufferSource();
    src.buffer = buf;
    var g = A.ctx.createGain();
    g.gain.value = Math.min(0.5, 0.1 + strength * 0.01);
    var f = A.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 300;
    src.connect(f);
    f.connect(g);
    g.connect(A.master);
    src.start(t);
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.value = m ? 0 : 0.5;
  };

  SB.audio = A;
})();
