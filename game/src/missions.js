// Missions, story and dialog. The current job, its stages, the fixer's lines
// and the crew call-outs. Saving/loading progress via localStorage.

(function () {
  'use strict';

  const Dialog = {
    lines: [
      { who: 'fixer', text: 'Four stars and a chopper, Daz — lose the blue lights or lose the car. Your call, make it fast.' },
      { who: 'fixer', text: 'The garage on Solana is open till nine. After that, the car is evidence.' },
      { who: 'crew0', text: 'Plates are hot. Say the word and I swap them at the next light.' },
      { who: 'crew2', text: 'Air-1 is right over us. Get under the bridge and they lose the light.' },
    ],
    idx: 0,
    current() { return this.lines[this.idx % this.lines.length]; },
    next() { this.idx++; return this.current(); },
  };

  const Missions = {
    state: {
      jobIndex: 4, // 0-based: JOB 5/8
      stage: 3, stages: 4,
      timer: VB.CONFIG.mission.timer,
      wanted: VB.CONFIG.player.wanted,
      money: VB.CONFIG.player.money,
      health: VB.CONFIG.player.health,
      armor: VB.CONFIG.player.armor,
      rep: VB.CONFIG.player.rep,
      repXp: VB.CONFIG.player.repXp,
      drift: 3, nearMiss: 250,
      paused: false, started: false,
    },

    dialog: Dialog,

    save() {
      try {
        localStorage.setItem('verano-bay-save', JSON.stringify({
          jobIndex: this.state.jobIndex, money: this.state.money,
          rep: this.state.rep, repXp: this.state.repXp,
          at: new Date().toISOString(),
        }));
        return true;
      } catch (e) { return false; }
    },

    load() {
      try {
        const raw = localStorage.getItem('verano-bay-save');
        if (!raw) return null;
        const s = JSON.parse(raw);
        this.state.jobIndex = s.jobIndex || 0;
        this.state.money = s.money || VB.CONFIG.player.money;
        this.state.rep = s.rep || 1;
        this.state.repXp = s.repXp || 0;
        return s;
      } catch (e) { return null; }
    },

    hasSave() {
      try { return !!localStorage.getItem('verano-bay-save'); } catch (e) { return false; }
    },

    // Mission clock ticks only while playing (not on title / paused / staged shots).
    tick(dt) {
      if (!this.state.started || this.state.paused) return;
      this.state.timer = Math.max(0, this.state.timer - dt);
    },

    addCash(n) { this.state.money += n; },
    addRep(n) {
      this.state.repXp += n;
      if (this.state.repXp >= VB.CONFIG.player.repMax) {
        this.state.repXp -= VB.CONFIG.player.repMax;
        this.state.rep = Math.min(10, this.state.rep + 1);
      }
    },
  };

  VB.missions = Missions;
})();
