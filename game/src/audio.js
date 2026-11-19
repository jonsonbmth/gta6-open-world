// Procedural WebAudio: engine hum, siren, radio stations as synth loops, UI blips.
// Everything is synthesized — no audio files — and nothing starts before the first
// user gesture (the START ENGINE click). Mute toggles the master gain.
import { RADIO } from './config.js';

const STATION_CHORDS = {
  synth: [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 294]],
  chill: [[131, 165, 196], [147, 175, 220], [165, 196, 247], [131, 165, 196]],
  drive: [[110, 165, 220], [98, 147, 196], [123, 185, 247], [110, 165, 220]],
};

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioNodes = null;
  let engineNodes = null;
  let sirenNodes = null;
  let station = 0;
  let muted = false;
  let chordTimer = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function startRadio() {
    if (!ctx || radioNodes) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    gain.connect(master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.connect(gain);
    const oscs = [];
    const chords = STATION_CHORDS[RADIO[station].hue];
    const chord = chords[0];
    for (let i = 0; i < 3; i += 1) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = chord[i];
      osc.connect(filter);
      osc.start();
      oscs.push(osc);
    }
    radioNodes = { gain, filter, oscs, chordIndex: 0 };
  }

  function stopRadio() {
    if (!radioNodes) return;
    for (const osc of radioNodes.oscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    radioNodes.gain.disconnect();
    radioNodes = null;
  }

  function stepRadioChord(dt) {
    if (!radioNodes) return;
    chordTimer += dt;
    if (chordTimer < 2.4) return;
    chordTimer = 0;
    const chords = STATION_CHORDS[RADIO[station].hue];
    radioNodes.chordIndex = (radioNodes.chordIndex + 1) % chords.length;
    const chord = chords[radioNodes.chordIndex];
    for (let i = 0; i < 3; i += 1) {
      radioNodes.oscs[i].frequency.setTargetAtTime(chord[i], ctx.currentTime, 0.4);
    }
  }

  function startEngine() {
    if (!ctx || engineNodes) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    engineNodes = { osc, filter, gain };
  }

  function startSiren() {
    if (!ctx || sirenNodes) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 720;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    lfo.start();
    sirenNodes = { osc, lfo, gain };
  }

  function stopSiren() {
    if (!sirenNodes) return;
    try { sirenNodes.osc.stop(); sirenNodes.lfo.stop(); } catch { /* stopped */ }
    sirenNodes.gain.disconnect();
    sirenNodes = null;
  }

  return {
    get station() { return station; },
    get muted() { return muted; },
    // Called from the START ENGINE click — the only place audio is created.
    unlock() {
      if (!ensure()) return false;
      startRadio();
      startEngine();
      return true;
    },
    nextStation() {
      station = (station + 1) % RADIO.length;
      stopRadio();
      chordTimer = 0;
      if (ctx) startRadio();
      return RADIO[station];
    },
    setMuted(value) {
      muted = !!value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05);
    },
    // Per-frame: engine pitch follows speed, siren follows wanted level.
    update(dt, speedKmh, wanted) {
      if (!ctx) return;
      stepRadioChord(dt);
      if (engineNodes) {
        const target = 55 + Math.min(speedKmh, 200) * 0.55;
        engineNodes.osc.frequency.setTargetAtTime(target, ctx.currentTime, 0.08);
        engineNodes.gain.gain.setTargetAtTime(speedKmh > 1 ? 0.055 : 0.02, ctx.currentTime, 0.1);
      }
      if (wanted >= 1 && !sirenNodes) startSiren();
      if (wanted === 0 && sirenNodes) stopSiren();
    },
    blip(freq = 880) {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
  };
}
