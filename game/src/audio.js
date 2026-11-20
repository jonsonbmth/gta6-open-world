// SOLMAR BAY — procedural sound: engine hum, wind, checkpoint chime. All
// synthesised with WebAudio, no audio files. Starts only after a user gesture.

var SB = window.SB || (window.SB = {});

SB.audio = (function () {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let muted = false;
  let started = false;

  function init() {
    if (started) return;
    started = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // Engine: a sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      // Wind: looped noise through a bandpass, gain follows speed.
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 700;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(band);
      band.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      ctx = null;
    }
  }

  function update(speed, throttle, dt) {
    if (!ctx || muted) return;
    const target = throttle ? 0.05 : 0.02;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 4.5, ctx.currentTime, 0.08);
    windGain.gain.setTargetAtTime(Math.min(0.06, Math.abs(speed) * 0.0016), ctx.currentTime, 0.15);
  }

  function chime() {
    if (!ctx || muted) return;
    try {
      const now = ctx.currentTime;
      [880, 1318].forEach(function (f, i) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.18, now + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.09);
        o.stop(now + i * 0.09 + 0.45);
      });
    } catch (e) { /* sound is optional */ }
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) {
      if (engineGain) engineGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
    }
    return muted;
  }

  return { init: init, update: update, chime: chime, toggleMute: toggleMute };
})();
