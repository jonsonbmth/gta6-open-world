// Story jobs: 7 missions with stages, dialogue, rewards.
// 'wanted' stages LATCH: progress accumulates and never drops when stars fall.

import { JOBS } from './config.js';

export class MissionSystem {
  constructor() {
    this.jobIndex = 0;
    this.stageIndex = 0;
    this.stageTimer = 0;
    this.latched = 0; // latched progress for wanted-hold stages (never decreases)
    this.dialogue = []; // queued { who, text }
    this.money = 0;
    this.completedJobs = 0;
    this._queueJobDialogue();
  }

  get job() { return JOBS[Math.min(this.jobIndex, JOBS.length - 1)]; }
  get stage() { return this.job.stages[Math.min(this.stageIndex, this.job.stages.length - 1)]; }
  get done() { return this.jobIndex >= JOBS.length; }

  _queueJobDialogue() {
    if (this.done) return;
    for (const d of this.job.dialogue) this.dialogue.push(d);
  }

  nextDialogue() {
    return this.dialogue.shift() || null;
  }

  peekDialogue() {
    return this.dialogue[0] || null;
  }

  // Fraction of the current stage complete (0..1), for the HUD progress bar.
  stageProgress(ctx) {
    const s = this.stage;
    if (!s) return 1;
    if (s.type === 'goto' && s.at) {
      const d = Math.hypot(ctx.playerPos.x - s.at.x, ctx.playerPos.z - s.at.z);
      return Math.max(0, 1 - d / 140);
    }
    if (s.type === 'evade' || s.type === 'wanted-hold') {
      return Math.min(1, (s.type === 'wanted-hold' ? this.latched : this.stageTimer) / (s.seconds || 1));
    }
    if (s.type === 'wanted') {
      return Math.min(1, ctx.wanted / (s.stars || 1));
    }
    return 0;
  }

  marker() {
    const s = this.stage;
    return s && s.type === 'goto' && s.at ? s.at : null;
  }

  _completeStage(ctx) {
    this.stageIndex++;
    this.stageTimer = 0;
    this.latched = 0;
    if (this.stageIndex >= this.job.stages.length) {
      this.money += this.job.reward;
      this.completedJobs++;
      this.dialogue.push({ who: 'rosa', text: `Job done. $${this.job.reward.toLocaleString()} — clean work, Rico.` });
      this.jobIndex++;
      this.stageIndex = 0;
      if (!this.done) this._queueJobDialogue();
    }
    return true;
  }

  // ctx: { playerPos, inCar, wanted, speed, policeNear, collected }
  update(dt, ctx) {
    if (this.done) return false;
    const s = this.stage;
    switch (s.type) {
      case 'enter-car':
        if (ctx.inCar) return this._completeStage(ctx);
        break;
      case 'goto': {
        const d = Math.hypot(ctx.playerPos.x - s.at.x, ctx.playerPos.z - s.at.z);
        if (d < 7) return this._completeStage(ctx);
        break;
      }
      case 'collect':
        if (ctx.collected) return this._completeStage(ctx);
        break;
      case 'evade':
        if (!ctx.policeNear) {
          this.stageTimer += dt;
          if (this.stageTimer >= (s.seconds || 10)) return this._completeStage(ctx);
        } else {
          this.stageTimer = Math.max(0, this.stageTimer - dt * 0.5);
        }
        break;
      case 'wanted':
        if (ctx.wanted >= (s.stars || 1)) return this._completeStage(ctx);
        break;
      case 'wanted-hold':
        // LATCH: only accumulate while stars are held; never auto-complete
        // or lose progress when stars drop to 0.
        if (ctx.wanted >= (s.stars || 1)) {
          this.latched += dt;
          if (this.latched >= (s.seconds || 10)) return this._completeStage(ctx);
        }
        break;
      default:
        break;
    }
    return false;
  }

  // Save/restore WITHOUT restarting job stages.
  serialize() {
    return {
      jobIndex: this.jobIndex,
      stageIndex: this.stageIndex,
      latched: this.latched,
      stageTimer: this.stageTimer,
      completedJobs: this.completedJobs,
    };
  }

  restore(s) {
    if (!s) return;
    this.jobIndex = s.jobIndex || 0;
    this.stageIndex = s.stageIndex || 0;
    this.latched = s.latched || 0;
    this.stageTimer = s.stageTimer || 0;
    this.completedJobs = s.completedJobs || 0;
    this.dialogue = [];
  }
}
