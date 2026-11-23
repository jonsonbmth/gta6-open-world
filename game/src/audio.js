// Procedural audio: everything is synthesized with the Web Audio API —
// engine hum, police siren, UI blips and a radio sting. No audio files.
// The context starts suspended until the first key or click, as browsers
// require; N toggles mute.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth through a lowpass, pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a sine that sweeps between two tones when wanted.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  function blip(freq, dur, type = 'sine', vol = 0.25) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    ensure,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    // Called every frame: engine pitch from speed, siren wail from stars.
    update(speed, stars, time) {
      if (!ctx || !engineOsc) return;
      const target = speed > 0.5 ? 0.05 + Math.min(0.1, speed * 0.002) : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 3.2, ctx.currentTime, 0.1);
      if (stars > 0) {
        sirenGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.2);
        sirenOsc.frequency.setTargetAtTime(Math.sin(time * 2.4) > 0 ? 720 : 960, ctx.currentTime, 0.05);
      } else {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      }
    },
    pickup() {
      blip(880, 0.12, 'sine', 0.2);
      setTimeout(() => blip(1320, 0.15, 'sine', 0.18), 70);
    },
    crash() {
      blip(90, 0.3, 'square', 0.3);
    },
    shoot() {
      blip(220, 0.08, 'square', 0.22);
    },
    radioSting() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.2), i * 90));
    },
    click() {
      blip(1200, 0.05, 'sine', 0.15);
    },
  };
}
