// SOLSTICE BAY — procedural audio: engine hum, police siren, radio jingles.
// Everything is synthesized with WebAudio oscillators. No audio files.
window.SB = window.SB || {};
SB.Audio = (function () {
  let ctx = null, engineOsc = null, engineGain = null, engineFilter = null;
  let sirenOsc = null, sirenGain = null, sirenTimer = null, muted = false;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch (e) { return false; }
  }
  function init() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
    }
    if (!sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain).connect(ctx.destination);
      sirenOsc.start();
      let hi = false;
      sirenTimer = setInterval(() => {
        if (!sirenOsc) return;
        hi = !hi;
        sirenOsc.frequency.setTargetAtTime(hi ? 950 : 700, ctx.currentTime, 0.08);
      }, 420);
    }
  }
  function setEngine(speedKmh, on) {
    if (!engineOsc || !ctx) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(muted || !on ? 0 : 0.05 + Math.min(0.06, speedKmh / 2400), t, 0.1);
    engineOsc.frequency.setTargetAtTime(50 + speedKmh * 1.1, t, 0.1);
    engineFilter.frequency.setTargetAtTime(240 + speedKmh * 6, t, 0.1);
  }
  function setSiren(on) {
    if (!sirenGain || !ctx) return;
    sirenGain.gain.setTargetAtTime(muted || !on ? 0 : 0.035, ctx.currentTime, 0.2);
  }
  function blip(freq) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq || 880;
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.13);
  }
  function jingle() {
    if (!ensure() || muted) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.25);
    });
  }
  function toggleMute() { muted = !muted; return muted; }
  return { init, setEngine, setSiren, blip, jingle, toggleMute, get muted() { return muted; } };
})();
