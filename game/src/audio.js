// Sound: all synthesized with WebAudio — engine hum, siren, beeps, drift skid.
// No audio files, so nothing loads over the network.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      engineOsc.connect(lp);
      lp.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch (e) { ctx = null; }
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEngine(speed01, on) {
      if (!ctx || muted) { if (engineGain) engineGain.gain.value = 0; return; }
      engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0;
      engineOsc.frequency.value = 55 + speed01 * 130;
    },
    setSiren(on, t) {
      sirenOn = on;
      if (!ctx || muted) { if (sirenGain) sirenGain.gain.value = 0; return; }
      sirenGain.gain.value = on ? 0.02 : 0;
      if (on) sirenOsc.frequency.value = 700 + Math.sin(t * 4) * 180;
    },
    beep(freq = 880, dur = 0.08, vol = 0.06) {
      if (!ctx || muted) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    get isMuted() { return muted; },
  };
}
