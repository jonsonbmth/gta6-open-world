// Aurelia Bay — jobs and story. Eight staged jobs with named contacts,
// objectives, timers and dialogue. The active job (7/8, THE EMBER RUN) is
// the one the screenshots show: steal the car, lose the heat, reach the
// garage, deliver to Vera. Each stage has a GPS target the minimap routes
// to, and completing a stage pays out and advances the story.
(function () {
  'use strict';
  var U = window.AB.util;

  var JOBS = [
    { id: 1, name: 'FIRST LIGHT', contact: 'Vera "The Velvet" Castillo', role: 'FIXER',
      brief: 'Prove you can drive. Take the coupe from Coral Market to the Gilded Quay garage without a scratch.',
      stages: ['Take the coupe', 'Drive to the garage', 'Park it clean'], reward: 1200, done: true },
    { id: 2, name: 'SALT AND STATIC', contact: 'Lena "Luz" Mora', role: 'DRIVER',
      brief: 'Lena needs a wheelman for a midnight pickup on Marina Row. Keep it quiet, keep it quick.',
      stages: ['Meet Lena at the pier', 'Drive the pickup route', 'Drop the package'], reward: 2400, done: true },
    { id: 3, name: 'THE LONG WAY HOME', contact: 'Hugo "Wrench" Salas', role: 'MECHANIC',
      brief: 'A client car is impounded at the ABX lot. Hugo has the keys; you have the nerve.',
      stages: ['Reach the impound lot', 'Take the Strada', 'Lose the patrol'], reward: 3100, done: true },
    { id: 4, name: 'PAPER LANTERNS', contact: 'Nina "Hawk" Duarte', role: 'LOOKOUT',
      brief: 'Nina spotted the courier. Tail him through Palma Row and lift the ledger when he stops.',
      stages: ['Tail the courier', 'Lift the ledger', 'Vanish'], reward: 4800, done: true },
    { id: 5, name: 'HIGH WATER', contact: 'Vera "The Velvet" Castillo', role: 'FIXER',
      brief: 'The tide brings a boatload of trouble to Ember Strand. Meet it, move it, make it gone.',
      stages: ['Meet the boat', 'Load the cargo', 'Deliver to the warehouse'], reward: 6500, done: true },
    { id: 6, name: 'STATIC ON THE LINE', contact: 'Kiki "Switch" Okafor', role: 'HACKER',
      brief: 'Kiki jammed the ABPD dispatch for six minutes. That is your whole window. Use it.',
      stages: ['Reach the relay', 'Hold the signal', 'Get clear'], reward: 8200, done: true },
    { id: 7, name: 'THE EMBER RUN', contact: 'Vera "The Velvet" Castillo', role: 'FIXER',
      brief: 'Six guns and a chopper, Dante — lose the lights or lose the car. Shake the ABPD, then reach the garage.',
      stages: ['Steal the Dorado GT', 'Lose the heat', 'Reach the garage', 'Deliver the car to Vera'],
      reward: 12500, done: false },
    { id: 8, name: 'GILDED TIDE', contact: 'Marco "The Tide" Reyes', role: 'SMUGGLER',
      brief: 'The last boat out of Aurelia Bay leaves at dawn. Be on it, or be the reason it never sails.',
      stages: ['Reach the marina', 'Hold the dock', 'Board the boat'], reward: 20000, done: false, locked: true }
  ];

  var DIALOGUE = {
    start: [
      { who: 'VERA', text: 'Six guns and a chopper, Dante — lose the lights or lose the car.' },
      { who: 'DANTE', text: 'Relax, Vera. The Dorado does the talking.' }
    ],
    heat: [
      { who: 'LENA', text: 'Falcon-2 is on your tail. Cut through Coral Market, lose them in the stalls.' },
      { who: 'HUGO', text: 'Engine sounds fine from here. Keep it that way.' }
    ],
    garage: [
      { who: 'VERA', text: 'Garage is open. Bring her in slow — I want this one clean.' },
      { who: 'NINA', text: 'Eyes out: two cruisers on Palma Row. You are clear on Sunset Mile.' }
    ],
    done: [
      { who: 'VERA', text: 'Beautiful. The Velvet pays on delivery — twelve-five, as promised.' },
      { who: 'DANTE', text: 'Tell Marco the tide is turning. I am ready for the last run.' }
    ]
  };

  // GPS targets per stage of the active job (world coordinates).
  var STAGE_TARGETS = [
    { x: -52, z: -48, label: 'Dorado GT' },
    { x: 0, z: 0, label: 'Lose the heat' },
    { x: -28, z: 96, label: 'Gilded Quay garage' },
    { x: -28, z: 96, label: 'Vera at the garage' }
  ];

  function makeMissions() {
    var activeId = 7;
    var stage = 1; // 0-based index into the active job's stages; start at 1 (Lose the heat) for the chase shot
    var timer = 192; // 3:12 on the clock
    var dialogIdx = 0;
    var dialogQueue = DIALOGUE.start.slice();
    var completedCount = 6;

    function activeJob() {
      return JOBS[activeId - 1];
    }

    function currentStageText() {
      return activeJob().stages[stage];
    }

    function nextStageText() {
      var stages = activeJob().stages;
      return stage + 1 < stages.length ? stages[stage + 1] : 'Job complete';
    }

    function target() {
      return STAGE_TARGETS[Math.min(stage, STAGE_TARGETS.length - 1)];
    }

    function advance() {
      stage++;
      if (stage >= activeJob().stages.length) {
        // job complete
        activeJob().done = true;
        completedCount++;
        dialogQueue = DIALOGUE.done.slice();
        dialogIdx = 0;
        return { completed: true, reward: activeJob().reward };
      }
      if (stage === 2) dialogQueue = DIALOGUE.garage.slice();
      else if (stage === 1) dialogQueue = DIALOGUE.heat.slice();
      dialogIdx = 0;
      return { completed: false };
    }

    function currentDialogue() {
      return dialogQueue[dialogIdx] || dialogQueue[dialogQueue.length - 1];
    }

    function nextDialogue() {
      if (dialogIdx < dialogQueue.length - 1) dialogIdx++;
      return currentDialogue();
    }

    return {
      jobs: JOBS,
      get activeId() { return activeId; },
      get stage() { return stage; },
      get timer() { return timer; },
      get completedCount() { return completedCount; },
      activeJob: activeJob,
      currentStageText: currentStageText,
      nextStageText: nextStageText,
      target: target,
      advance: advance,
      currentDialogue: currentDialogue,
      nextDialogue: nextDialogue,
      tickTimer: function (dt) {
        timer = Math.max(0, timer - dt);
        return timer;
      },
      setStage: function (s) { stage = U.clamp(s, 0, activeJob().stages.length - 1); },
      setTimer: function (t) { timer = t; },
      completionPercent: function () {
        var done = JOBS.filter(function (j) { return j.done; }).length;
        return Math.round((done / JOBS.length) * 100);
      }
    };
  }

  window.AB.missions = { makeMissions: makeMissions, JOBS: JOBS };
})();
