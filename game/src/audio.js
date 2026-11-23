// Procedural WebAudio for AURELIA BAY: engine hum, police siren, a chiptune
// radio loop and one-shot effects. Everything is synthesized — no audio
// files. Starts only after the first user gesture, as browsers require.
(function () {
  const AB = window.AB || (window.AB = {});

  function makeAudio() {
    const A = {
      ctx: null, master: null, muted: false, engineOsc: null, engineGain: null,
      sirenOsc: null, sirenGain: null, radioOn: true, station: 0,
      radioTimer: null, radioStep: 0, started: false,
    };

    function ensure() {
      if (A.ctx) return true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        A.ctx = new AC();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.5;
        A.master.connect(A.ctx.destination);
        // Engine: sawtooth through a lowpass, pitch follows speed.
        A.engineOsc = A.ctx.createOscillator();
        A.engineOsc.type = 'sawtooth';
        A.engineOsc.frequency.value = 55;
        const lp = A.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 420;
        A.engineGain = A.ctx.createGain();
        A.engineGain.gain.value = 0;
        A.engineOsc.connect(lp); lp.connect(A.engineGain); A.engineGain.connect(A.master);
        A.engineOsc.start();
        // Siren: two-tone square wave.
        A.sirenOsc = A.ctx.createOscillator();
        A.sirenOsc.type = 'triangle';
        A.sirenOsc.frequency.value = 720;
        A.sirenGain = A.ctx.createGain();
        A.sirenGain.gain.value = 0;
        A.sirenOsc.connect(A.sirenGain); A.sirenGain.connect(A.master);
        A.sirenOsc.start();
        A.started = true;
        return true;
      } catch (e) { return false; }
    }

    function resume() {
      if (ensure() && A.ctx.state === 'suspended') A.ctx.resume();
      if (A.started && A.radioOn && !A.radioTimer) startRadio();
    }

    // Radio: a small step sequencer — bass + lead arpeggio, two stations.
    const SCALES = [
      [220, 261.6, 329.6, 392, 440, 523.3], // A minor, mellow
      [196, 246.9, 293.7, 392, 440, 587.3], // G minor, driving
    ];
    const BASS = [[110, 110, 130.8, 164.8], [98, 98, 123.5, 146.8]];
    function note(freq, time, dur, type, vol) {
      const o = A.ctx.createOscillator();
      o.type = type || 'square';
      o.frequency.value = freq;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.05, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      o.connect(g); g.connect(A.master);
      o.start(time); o.stop(time + dur + 0.02);
    }
    function startRadio() {
      if (!A.ctx) return;
      const stepDur = A.station === 0 ? 0.22 : 0.17;
      A.radioTimer = setInterval(function () {
        if (A.muted || !A.radioOn) return;
        const now = A.ctx.currentTime;
        const scale = SCALES[A.station];
        const s = A.radioStep;
        if (s % 4 === 0) note(BASS[A.station][(s / 4 | 0) % 4], now, 0.3, 'triangle', 0.09);
        const melody = [0, 2, 4, 5, 4, 2, 3, 1];
        note(scale[melody[s % 8]], now, 0.18, 'square', 0.035);
        if (s % 2 === 0) note(scale[(s * 3) % 6] * 2, now, 0.1, 'sine', 0.02);
        A.radioStep++;
      }, stepDur * 1000);
    }
    function stopRadio() {
      if (A.radioTimer) { clearInterval(A.radioTimer); A.radioTimer = null; }
    }
    function cycleStation() {
      A.station = (A.station + 1) % 3;
      if (A.station === 2) { A.radioOn = false; stopRadio(); return 'OFF'; }
      A.radioOn = true;
      stopRadio(); startRadio();
      return A.station === 0 ? 'AURELIA FM 98.2' : 'COAST DRIVE 104.7';
    }

    function setEngine(speed, maxSpeed) {
      if (!A.ctx || !A.engineOsc) return;
      const t = speed / Math.max(1, maxSpeed);
      A.engineOsc.frequency.setTargetAtTime(50 + t * 160, A.ctx.currentTime, 0.08);
      A.engineGain.gain.setTargetAtTime(A.muted ? 0 : 0.05 + t * 0.08, A.ctx.currentTime, 0.1);
    }
    function setSiren(on, t) {
      if (!A.ctx || !A.sirenOsc) return;
      A.sirenOsc.frequency.setTargetAtTime(on ? (Math.sin(t * 5) > 0 ? 720 : 540) : 720, A.ctx.currentTime, 0.05);
      A.sirenGain.gain.setTargetAtTime(on && !A.muted ? 0.035 : 0, A.ctx.currentTime, 0.15);
    }
    function blip(freq, dur, vol) {
      if (!A.ctx || A.muted) return;
      note(freq, A.ctx.currentTime, dur, 'sine', vol || 0.12);
    }
    function crash() {
      if (!A.ctx || A.muted) return;
      const now = A.ctx.currentTime;
      const len = 0.25;
      const buf = A.ctx.createBuffer(1, A.ctx.sampleRate * len, A.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = A.ctx.createBufferSource();
      src.buffer = buf;
      const g = A.ctx.createGain();
      g.gain.value = 0.25;
      src.connect(g); g.connect(A.master);
      src.start(now);
      note(70, now, 0.2, 'sine', 0.2);
    }
    function gunshot() {
      if (!A.ctx || A.muted) return;
      const now = A.ctx.currentTime;
      note(1200, now, 0.06, 'square', 0.12);
      note(180, now, 0.12, 'sawtooth', 0.15);
    }
    function jingle() {
      if (!A.ctx || A.muted) return;
      const now = A.ctx.currentTime;
      [523.3, 659.3, 783.99, 1046.5].forEach(function (f, i) { note(f, now + i * 0.11, 0.22, 'triangle', 0.1); });
    }
    function toggleMute() {
      A.muted = !A.muted;
      if (A.master) A.master.gain.value = A.muted ? 0 : 0.5;
      return A.muted;
    }

    A.resume = resume; A.setEngine = setEngine; A.setSiren = setSiren;
    A.blip = blip; A.crash = crash; A.gunshot = gunshot; A.jingle = jingle;
    A.toggleMute = toggleMute; A.cycleStation = cycleStation;
    A.stationName = function () { return A.radioOn ? (A.station === 0 ? 'AURELIA FM 98.2' : 'COAST DRIVE 104.7') : 'RADIO OFF'; };
    return A;
  }

  AB.Audio = { makeAudio: makeAudio };
})();
