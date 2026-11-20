// Story missions: 8 jobs, stage progress, timers, GPS checkpoints, rewards.
var CV = window.CV || (window.CV = {});

CV.missions = (function () {
  var C = CV.config;
  var state = {
    jobIndex: C.JOB_INDEX,
    stage: C.JOB_STAGE,
    stages: C.JOB_STAGES,
    timer: 167, // 2:47
    checkpoint: 0,
    cash: C.PLAYER.cash,
    rep: C.PLAYER.rep,
    jobsDone: 3,
    bestDrift: 0,
    nearMiss: 0,
    driftStreak: 0,
  };

  function currentJob() { return C.JOBS[state.jobIndex]; }
  function checkpoint() { return C.CHECKPOINTS[state.checkpoint]; }

  function distanceToCheckpoint(hero) {
    var cp = checkpoint();
    if (!cp) return 0;
    return Math.sqrt((cp.x - hero.x) * (cp.x - hero.x) + (cp.z - hero.z) * (cp.z - hero.z));
  }

  function update(dt, hero, drifting) {
    if (state.timer > 0) state.timer -= dt;
    if (drifting) {
      state.driftStreak += dt;
      if (state.driftStreak > 1.2) {
        state.bestDrift = Math.max(state.bestDrift, Math.round(state.driftStreak * 14));
      }
    } else {
      state.driftStreak = 0;
    }
    // Checkpoint reached?
    var cp = checkpoint();
    if (cp) {
      var d = distanceToCheckpoint(hero);
      if (d < 7) {
        state.cash += 250;
        state.rep = Math.min(C.PLAYER.repMax, state.rep + 40);
        state.checkpoint++;
        if (state.checkpoint >= C.CHECKPOINTS.length) {
          // Job complete: advance to the next job.
          state.jobsDone++;
          state.cash += 1200;
          state.jobIndex = Math.min(C.JOBS.length - 1, state.jobIndex + 1);
          state.stage = 1;
          state.checkpoint = 0;
          state.timer = 240;
        } else {
          state.stage = Math.min(state.stages, state.stage + 1);
        }
        CV.world.setCheckpoint(state.checkpoint % C.CHECKPOINTS.length);
        return { checkpoint: true, job: currentJob().title };
      }
    }
    return null;
  }

  function nearMissBonus() {
    state.cash += 250;
    state.nearMiss++;
    return 250;
  }

  function timerText() {
    var t = Math.max(0, Math.ceil(state.timer));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  return {
    state: state, currentJob: currentJob, checkpoint: checkpoint,
    distanceToCheckpoint: distanceToCheckpoint, update: update,
    nearMissBonus: nearMissBonus, timerText: timerText,
  };
})();
