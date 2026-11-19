// SOLMAR BAY — story: seven jobs with stages, objectives, dialogue and GPS.
// A "lose the cops" stage only completes once the heat was actually on and
// then fell to zero (latched), never because the stars were already zero.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var A = SB.world.ANCHORS;

  var JOBS = [
    {
      title: 'First Run', reward: 1200, respect: 150,
      stages: [
        { type: 'enter', text: 'Get in the VULPINE S', next: 'Press E near the red sports car',
          say: { who: 'rosa', line: 'Tonight the city learns our name, Rico. Drive it home.' } },
        { type: 'drive', target: 'garage', text: 'Drive to the garage on Palm Row', next: 'Follow the GPS route on the map',
          say: { who: 'lena', line: 'Garage is on Palm Row. Easy run — unless you make it loud.' } },
        { type: 'lose', heat: 2, text: 'Lose the cops', next: 'Break line of sight — stay out of view',
          say: { who: 'lena', line: 'Two units on your tail, Rico — lose them on Palm Row!' } },
        { type: 'reach', target: 'garage', text: 'Reach the garage', next: 'Park inside the marker',
          say: { who: 'rosa', line: 'Good. Park it inside and breathe. You did fine.' } }
      ]
    },
    {
      title: 'Neon Errand', reward: 1500, respect: 180,
      stages: [
        { type: 'drive', target: 'velaMarket', text: 'Drive to Vela Market', next: 'The package waits under the awning',
          say: { who: 'dario', line: 'Vela Market, back door. Grab the duffel and do not open it.' } },
        { type: 'reach', target: 'velaMarket', text: 'Pick up the package on foot', next: 'Walk into the marker to grab it',
          say: { who: 'dario', line: 'On foot now. Quick hands, Rico.' } },
        { type: 'drive', target: 'mamaHouse', text: 'Deliver to Mama Rosa', next: 'Mama is waiting uptown',
          say: { who: 'rosa', line: 'Bring it here, mijo. The kettle is already on.' } }
      ]
    },
    {
      title: 'Hot Wheels', reward: 2200, respect: 220,
      stages: [
        { type: 'steal', target: 'crownRoad', carKind: 'coupe', text: 'Steal the coupe on Crown Road', next: 'Press E near the blue coupe',
          say: { who: 'lena', line: 'Blue coupe, Crown Road. I need its gearbox by midnight.' } },
        { type: 'drive', target: 'lenaWorkshop', text: 'Drive to Lena\'s workshop', next: 'She is waiting with the tools out',
          say: { who: 'lena', line: 'Bring her in warm. Do not scratch the paint — I like this one.' } },
        { type: 'lose', heat: 2, text: 'Lose the cops', next: 'The owner called it in — vanish',
          say: { who: 'lena', line: 'They flagged the plates! Lose them before the workshop.' } }
      ]
    },
    {
      title: 'Rain Check', reward: 2600, respect: 260,
      stages: [
        { type: 'drive', target: 'docks', text: 'Meet Dario at the docks', next: 'He is by the north pier',
          say: { who: 'dario', line: 'Docks, north pier. I have a buyer and a very short fuse.' } },
        { type: 'reach', target: 'docks', text: 'Talk to Dario', next: 'Walk up to him on the pier',
          say: { who: 'dario', line: 'Change of plan — the buyer moved to the plaza. Follow me.' } },
        { type: 'drive', target: 'plaza', text: 'Follow Dario to the plaza', next: 'Stay close through downtown',
          say: { who: 'dario', line: 'Downtown, fast. If we lose the light we lose the deal.' } },
        { type: 'lose', heat: 3, text: 'Escape the ambush', next: 'Three stars — survive and vanish',
          say: { who: 'lena', line: 'It was a setup! Three stars on you — run, Rico, run!' } }
      ]
    },
    {
      title: 'Harbor Lights', reward: 3200, respect: 300,
      stages: [
        { type: 'drive', target: 'docks', text: 'Drive to the docks', next: 'The crate is on the south pier',
          say: { who: 'rosa', line: 'A crate came off the night ferry. It belongs to us now.' } },
        { type: 'wait', target: 'docks', seconds: 4, text: 'Load the crate', next: 'Stay in the marker to load it',
          say: { who: 'dario', line: 'Heavy one. Give me four seconds and it is ours.' } },
        { type: 'drive', target: 'garage', heat: 3, text: 'Return to the garage, pursued', next: 'Harbor patrol is awake — go!',
          say: { who: 'lena', line: 'Harbor patrol is on you! Garage, now — do not stop for red lights.' } }
      ]
    },
    {
      title: 'Midnight Oil', reward: 4000, respect: 360,
      stages: [
        { type: 'drive', target: 'lighthouse', timeLimit: 100, text: 'Race to the lighthouse', next: '100 seconds — the exchange waits for no one',
          say: { who: 'dario', line: 'Lighthouse, north point. One hundred seconds or the deal walks.' } },
        { type: 'wait', target: 'lighthouse', seconds: 5, text: 'Watch the exchange', next: 'Stay hidden and watch it happen',
          say: { who: 'dario', line: 'Eyes on them. Five seconds and we know everything.' } },
        { type: 'lose', heat: 3, text: 'Lose the tail', next: 'They spotted the camera — disappear',
          say: { who: 'lena', line: 'They saw the flash! Three stars — melt into the rain.' } }
      ]
    },
    {
      title: 'Solmar Bay', reward: 6000, respect: 500,
      stages: [
        { type: 'drive', target: 'plaza', text: 'Drive to the plaza', next: 'Everyone who matters is there tonight',
          say: { who: 'rosa', line: 'One last drive, Rico. The whole city is watching tonight.' } },
        { type: 'survive', heat: 4, seconds: 45, text: 'Survive the four-star pursuit', next: 'Stay ahead for 45 seconds',
          say: { who: 'lena', line: 'Four stars! AIR-1 is up! Just stay moving — do not stop!' } },
        { type: 'reach', target: 'safehouse', text: 'Reach the safehouse', next: 'Home. The night is yours.',
          say: { who: 'rosa', line: 'Home, mijo. You own this city now.' } }
      ]
    }
  ];

  var state = { job: 0, stage: 0, latched: false, timer: 0, won: false, onStageStart: null };

  function current() { return JOBS[Math.min(state.job, JOBS.length - 1)]; }
  function stage() {
    var j = current();
    return j.stages[Math.min(state.stage, j.stages.length - 1)];
  }
  function target() {
    var s = stage();
    if (!s.target) return null;
    var a = A[s.target];
    return a ? { x: a.x, z: a.z, label: s.target } : null;
  }
  function progress() {
    var j = current();
    return { job: state.job + 1, jobs: JOBS.length, stage: state.stage + 1, stages: j.stages.length };
  }

  function beginStage() {
    var s = stage();
    state.latched = false;
    state.timer = 0;
    if (s.heat) SB.police.setWanted(s.heat);
    if (s.say && SB.hud) SB.hud.showDialogue(s.say.who, s.say.line);
    if (state.onStageStart) state.onStageStart(state.job, state.stage, s);
    if (SB.hud) SB.hud.refreshMission();
  }

  function setJobStage(job, st) {
    state.job = Math.max(0, Math.min(job, JOBS.length - 1));
    state.stage = Math.max(0, Math.min(st, JOBS[state.job].stages.length - 1));
    state.won = false;
    beginStage();
  }

  function advance() {
    var j = current();
    SB.audio.blip(990);
    if (state.stage + 1 < j.stages.length) {
      state.stage++;
      beginStage();
      return;
    }
    // Job complete.
    var g = SB.game;
    if (g) {
      g.state.money += j.reward;
      g.state.respect += j.respect;
      g.state.jobsDone++;
      g.state.respectLevel = 2 + Math.floor(g.state.respect / 500);
      SB.save.save(g.state);
    }
    if (SB.hud) SB.hud.toast('JOB COMPLETE — ' + j.title + '  +$' + j.reward);
    if (state.job + 1 < JOBS.length) {
      state.job++;
      state.stage = 0;
      beginStage();
    } else {
      state.won = true;
      if (SB.hud) SB.hud.toast('YOU OWN THE NIGHT — all seven jobs done. Solmar Bay is yours.');
    }
  }

  function update(dt, ctx) {
    if (state.won) return;
    var s = stage();
    var t = target();
    var px = ctx.x, pz = ctx.z;
    var d2 = t ? ((px - t.x) * (px - t.x) + (pz - t.z) * (pz - t.z)) : 1e9;
    switch (s.type) {
      case 'enter':
        if (ctx.inCar && ctx.carName === 'VULPINE S') advance();
        break;
      case 'steal':
        if (ctx.inCar && ctx.stoleTarget) advance();
        break;
      case 'drive':
      case 'reach':
        if (d2 < 81) advance(); // within 9 m
        break;
      case 'wait':
        if (d2 < 100) {
          state.timer += dt;
          if (state.timer >= (s.seconds || 3)) advance();
        } else { state.timer = 0; }
        break;
      case 'lose':
        if (!state.latched && SB.police.wanted() > 0) state.latched = true;
        if (state.latched && SB.police.wanted() === 0) advance();
        break;
      case 'survive':
        state.timer += dt;
        if (state.timer >= (s.seconds || 45)) {
          SB.police.setWanted(0);
          advance();
        }
        break;
    }
    // Timed drive: fail restarts the stage.
    if (s.timeLimit) {
      state.timer += dt;
      if (state.timer > s.timeLimit) {
        state.timer = 0;
        if (SB.hud) SB.hud.toast('Too slow — the deal walked. Try again.');
        beginStage();
      }
    }
  }

  SB.missions = {
    JOBS: JOBS, current: current, stage: stage, target: target,
    progress: progress, setJobStage: setJobStage, update: update,
    state: state
  };
})();
