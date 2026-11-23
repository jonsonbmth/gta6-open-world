// Aurelia Bay — procedural audio. No sound files: every station, the engine
// hum, the siren and the gunshot are synthesized with WebAudio. Audio starts
// only after the first user gesture (browsers require it) and the N key or
// the mute button silences everything. Radio is a looping chord pad + bass
// pattern; each station has its own tempo, key and waveform.
(function () {
  'use strict';

  var STATIONS = [
    { name: 'SOL FM 101.3', song: '"Blue Skies" — The Marigolds', bpm: 96, root: 220, wave: 'triangle' },
    { name: 'LAGOON FM 98.1', song: '"Night Swim" — Coral Static', bpm: 112, root: 196, wave: 'sawtooth' },
    { name: 'RADIO EMBER 94.7', song: '"Slow Burn" — The Gilded', bpm: 84, root: 174, wave: 'sine' }
  ];

  function makeAudio() {
    var ctx = null;
    var master = null;
    var radioGain = null;
    var engineOsc = null, engineGain = null;
    var sirenOsc = null, sirenGain = null;
    var stationIdx = 0;
    var muted = false;
    var started = false;
    var radioTimer = null;
    var step = 0;

    function ensure() {
      if (ctx) return true;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        radioGain = ctx.createGain();
        radioGain.gain.value = 0.16;
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
        started = true;
        startRadioLoop();
        return true;
      } catch (e) {
        return false;
      }
    }

    function resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // One bar of the current station: root + fifth pad, walking bass.
    function startRadioLoop() {
      if (radioTimer) return;
      var beatMs = 60000 / STATIONS[stationIdx].bpm / 2;
      radioTimer = setInterval(function () {
        if (!ctx || muted) return;
        var st = STATIONS[stationIdx];
        var t = ctx.currentTime;
        var scale = [1, 1.189, 1.335, 1.498, 1.782];
        var note = st.root * scale[step % scale.length];
        var o = ctx.createOscillator();
        o.type = st.wave;
        o.frequency.value = note;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beatMs / 1000 * 0.95);
        o.connect(g); g.connect(radioGain);
        o.start(t); o.stop(t + beatMs / 1000);
        if (step % 4 === 0) {
          var b = ctx.createOscillator();
          b.type = 'sine';
          b.frequency.value = st.root / 2;
          var bg = ctx.createGain();
          bg.gain.setValueAtTime(0.0001, t);
          bg.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
          bg.gain.exponentialRampToValueAtTime(0.0001, t + beatMs / 1000 * 1.8);
          b.connect(bg); bg.connect(radioGain);
          b.start(t); b.stop(t + beatMs / 1000 * 1.9);
        }
        step++;
      }, beatMs);
    }

    function setEngine(speedNorm, driving) {
      if (!ctx) return;
      var t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(50 + speedNorm * 130, t, 0.1);
      engineGain.gain.setTargetAtTime(driving && !muted ? 0.05 + speedNorm * 0.05 : 0, t, 0.15);
    }

    function setSiren(on) {
      if (!ctx) return;
      var t = ctx.currentTime;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.035 : 0, t, 0.3);
      if (on) {
        sirenOsc.frequency.cancelScheduledValues(t);
        sirenOsc.frequency.setValueAtTime(700, t);
        sirenOsc.frequency.linearRampToValueAtTime(950, t + 0.4);
        sirenOsc.frequency.linearRampToValueAtTime(700, t + 0.8);
      }
    }

    function gunshot() {
      if (!ctx || muted) return;
      var t = ctx.currentTime;
      var len = ctx.sampleRate * 0.14;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(g); g.connect(master);
      src.start(t);
    }

    function blip(freq) {
      if (!ctx || muted) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq || 880;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.14);
    }

    return {
      stations: STATIONS,
      get station() { return STATIONS[stationIdx]; },
      get muted() { return muted; },
      get started() { return started; },
      ensure: ensure,
      resume: resume,
      nextStation: function () {
        stationIdx = (stationIdx + 1) % STATIONS.length;
        return STATIONS[stationIdx];
      },
      setEngine: setEngine,
      setSiren: setSiren,
      gunshot: gunshot,
      blip: blip,
      toggleMute: function () {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 0.5;
        return muted;
      }
    };
  }

  window.AB.audio = { makeAudio: makeAudio, STATIONS: STATIONS };
})();
