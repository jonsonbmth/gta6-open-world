// Procedural WebAudio: engine hum, two-tone siren, radio stingers. No audio
// files. Everything is guarded: in headless runs the context simply never
// starts and the game stays silent.
var CV = window.CV || (window.CV = {});

CV.audio = (function () {
  var ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  var muted = false, started = false;

  function ensure() {
    if (started || typeof window === 'undefined') return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      started = true;
      // Engine: low sawtooth + sub sine, pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      var engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      // Siren: two alternating tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch (e) { /* audio unavailable — stay silent */ }
  }

  function update(speedKmh, policeNear, t) {
    if (!ctx || muted) return;
    try {
      if (engineOsc) {
        engineOsc.frequency.value = 50 + speedKmh * 1.1;
        engineGain.gain.value = 0.03 + Math.min(0.05, speedKmh * 0.0004);
      }
      if (sirenOsc) {
        sirenOsc.frequency.value = Math.sin(t * 5) > 0 ? 750 : 950;
        sirenGain.gain.value = policeNear ? 0.035 : 0.0;
      }
    } catch (e) { /* ignore */ }
  }

  function sting() {
    if (!ctx || muted) return;
    try {
      [523, 659, 784].forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.4);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.09);
        o.stop(ctx.currentTime + i * 0.09 + 0.45);
      });
    } catch (e) { /* ignore */ }
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) {
      try {
        if (engineGain) engineGain.gain.value = muted ? 0 : 0.04;
        if (sirenGain) sirenGain.gain.value = 0;
      } catch (e) { /* ignore */ }
    }
    return muted;
  }

  return { ensure: ensure, update: update, sting: sting, toggleMute: toggleMute, isMuted: function () { return muted; } };
})();
