// Procedural sound: everything is synthesized with WebAudio — no audio
// files. Engine hum, tyre screech, police siren, checkpoint chime, UI blips.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let skidSrc = null;
  let skidGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);

    // Engine: two detuned saws through a lowpass, pitch follows speed.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 620;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();

    // Skid: looped noise through a bandpass.
    const noiseLen = ctx.sampleRate * 1;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    skidSrc = ctx.createBufferSource();
    skidSrc.buffer = noiseBuf;
    skidSrc.loop = true;
    const skidFilter = ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.value = 900;
    skidFilter.Q.value = 1.4;
    skidGain = ctx.createGain();
    skidGain.gain.value = 0;
    skidSrc.connect(skidFilter);
    skidFilter.connect(skidGain);
    skidGain.connect(master);
    skidSrc.start();

    // Siren: a triangle that wails between two tones while police chase.
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 750;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    return true;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  let sirenPhase = 0;

  return {
    // Call from a user gesture (the Start button) to unlock audio.
    start() {
      if (!ensure() || started) return;
      started = true;
      if (ctx.state === 'suspended') void ctx.resume();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    // Per-frame: engine pitch from speed, skid while drifting, siren wail.
    update(speed, drifting, policeNear, dt) {
      if (!ctx || !started) return;
      const s = Math.min(Math.abs(speed) / 56, 1);
      engineOsc.frequency.value = 55 + s * 165;
      engineOsc2.frequency.value = 28 + s * 82;
      engineGain.gain.value = 0.05 + s * 0.075;
      skidGain.gain.value = drifting ? 0.11 : 0;
      if (policeNear) {
        sirenPhase += dt * 2.4;
        sirenOsc.frequency.value = 680 + Math.sin(sirenPhase * Math.PI * 2) * 180;
        sirenGain.gain.value = 0.045;
      } else {
        sirenGain.gain.value = 0;
      }
    },
    chime() {
      blip(660, 0.16, 'sine', 0.2);
      blip(990, 0.24, 'sine', 0.2, 0.1);
    },
    fanfare() {
      blip(523, 0.2, 'triangle', 0.22);
      blip(659, 0.2, 'triangle', 0.22, 0.14);
      blip(784, 0.34, 'triangle', 0.24, 0.28);
    },
    thud() {
      blip(90, 0.18, 'sine', 0.3);
    },
    click() {
      blip(880, 0.06, 'square', 0.06);
    },
    busted() {
      blip(392, 0.3, 'sawtooth', 0.12);
      blip(311, 0.5, 'sawtooth', 0.12, 0.25);
    },
  };
}
