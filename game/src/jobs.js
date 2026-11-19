// Story jobs for SOLMAR BAY: 7 jobs in Chapter 1, each with stages and
// dialogue. A stage completes on a named event (enter-car, reach-target,
// lose-heat, deliver, talk, pickup). 'Wanted' stages LATCH: they only
// complete once the heat has actually been lost (wanted reached 1+ and then
// dropped back to 0) — they never auto-complete at 0 stars.
export const JOBS = [
  {
    id: 1, chapter: 'CH 1', title: 'First Run',
    intro: { speaker: 'Mama Rosa', text: 'Tonight the city learns our name, Rico. Drive it home.' },
    stages: [
      { text: 'Get in the VULPINE S', next: 'Press E near the red sports car', event: 'enter-car',
        dialogue: { speaker: 'Mama Rosa', text: 'That car is your birthright. Treat her gentle.' } },
      { text: 'Drive to the garage on Palm Row', next: 'Follow the GPS route on the map', event: 'reach-target',
        dialogue: { speaker: 'Lena "Wrench" Ortiz', text: 'Two units on your tail, Rico — lose them on Palm Row!' } },
      { text: 'Lose the heat', next: 'Stay out of sight until the stars clear', event: 'lose-heat',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'Cool it, cool it. Cops hate the rain too.' } },
      { text: 'Deliver the car to the garage', next: 'Park inside the yellow marker', event: 'deliver',
        dialogue: { speaker: 'Mama Rosa', text: 'First run done. The bay is watching you now.' } },
    ],
  },
  {
    id: 2, chapter: 'CH 1', title: 'Neon Errand',
    intro: { speaker: 'Lena "Wrench" Ortiz', text: 'Got a package that needs legs. You are the legs.' },
    stages: [
      { text: 'Meet Lena at her workshop', next: 'Dockside Yard, east side', event: 'reach-target',
        dialogue: { speaker: 'Lena "Wrench" Ortiz', text: 'Took you long enough. Grab the case, go.' } },
      { text: 'Pick up the package', next: 'Press F at the workbench', event: 'pickup',
        dialogue: { speaker: 'Lena "Wrench" Ortiz', text: 'Do not open it. Do not drop it. Do not get shot.' } },
      { text: 'Deliver to the docks', next: 'Old Pier, harbour side', event: 'deliver',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'Clean drop. You are getting good at this.' } },
    ],
  },
  {
    id: 3, chapter: 'CH 1', title: 'Rain Check',
    intro: { speaker: 'Dario "Fuze" Kane', text: 'Marina job. You drive, I work, nobody talks.' },
    stages: [
      { text: 'Drive Dario to the marina', next: 'Harbour Lights quay', event: 'reach-target',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'Park close. I hate getting wet twice.' } },
      { text: 'Cover Dario while he works', next: 'Stay near the docks for 30 seconds', event: 'talk',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'Almost... got it. Move, move, move!' } },
      { text: 'Get out clean', next: 'Leave the harbour without heat', event: 'lose-heat',
        dialogue: { speaker: 'Mama Rosa', text: 'The storm covers many sins, mijo.' } },
    ],
  },
  {
    id: 4, chapter: 'CH 1', title: "Mama's Call",
    intro: { speaker: 'Mama Rosa', text: 'Vela Street owes us. Go collect, politely.' },
    stages: [
      { text: 'Collect on Vela Street', next: 'Three shops, three envelopes', event: 'pickup',
        dialogue: { speaker: 'Mama Rosa', text: 'Smile. A smile with a debt is still a smile.' } },
      { text: 'Return to Mama Rosa', next: 'Back to the marina', event: 'deliver',
        dialogue: { speaker: 'Mama Rosa', text: 'Every cent. You were raised right.' } },
    ],
  },
  {
    id: 5, chapter: 'CH 1', title: 'The Long Way',
    intro: { speaker: 'Lena "Wrench" Ortiz', text: 'Crown Tower. Cross town. Do not stop for anyone.' },
    stages: [
      { text: 'Cross town to Crown Tower', next: 'North end, past the canal', event: 'reach-target',
        dialogue: { speaker: 'Lena "Wrench" Ortiz', text: 'Tail on you — third car back. Shake it!' } },
      { text: 'Lose the tail', next: 'Break line of sight', event: 'lose-heat',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'They lost you in the spray. Beautiful.' } },
      { text: 'Reach the tower garage', next: 'Park inside the marker', event: 'deliver',
        dialogue: { speaker: 'Mama Rosa', text: 'The tower sees everything. Remember that.' } },
    ],
  },
  {
    id: 6, chapter: 'CH 1', title: 'Harbor Lights',
    intro: { speaker: 'Dario "Fuze" Kane', text: 'The docks office has our boat plans. Go get them.' },
    stages: [
      { text: 'Enter the docks office', next: 'Old Pier, upstairs', event: 'reach-target',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'Plans are in the back drawer. Hurry.' } },
      { text: 'Take the boat plans', next: 'Press F at the desk', event: 'pickup',
        dialogue: { speaker: 'Lena "Wrench" Ortiz', text: 'Alarms in thirty seconds. Run!' } },
      { text: 'Escape the harbour', next: 'Out past the bridge', event: 'lose-heat',
        dialogue: { speaker: 'Mama Rosa', text: 'You were never there. The rain agrees.' } },
    ],
  },
  {
    id: 7, chapter: 'CH 1', title: 'Night Shift',
    intro: { speaker: 'Mama Rosa', text: 'Three drops, one night. Then you are family, for real.' },
    stages: [
      { text: 'Drop 1: Vela Market', next: 'South side, under the awning', event: 'deliver',
        dialogue: { speaker: 'Lena "Wrench" Ortiz', text: 'One down. Two to go, do not get cute.' } },
      { text: 'Drop 2: Canal Bridge', next: 'Mid-span, by the lamp', event: 'deliver',
        dialogue: { speaker: 'Dario "Fuze" Kane', text: 'Halfway home. Keep the engine warm.' } },
      { text: 'Drop 3: Crown Tower', next: 'Rooftop garage', event: 'deliver',
        dialogue: { speaker: 'Mama Rosa', text: 'Done. Solmar Bay is yours tonight, Rico.' } },
    ],
  },
];

export class JobRunner {
  constructor() {
    this.jobIndex = 0;
    this.stageIndex = 0;
    this.heatLatched = false; // true once wanted hit 1+ during a lose-heat stage
    this.completedJobs = 0;
  }

  get job() {
    return JOBS[this.jobIndex];
  }

  get stage() {
    return this.job.job ? this.job.stages[this.stageIndex] : this.job.stages[this.stageIndex];
  }

  get stageCount() {
    return this.job.stages.length;
  }

  currentObjective() {
    return this.stage.text;
  }

  currentNext() {
    return this.stage.next;
  }

  // Feed live wanted level so lose-heat stages can latch.
  observeWanted(wanted) {
    if (this.stage.event === 'lose-heat' && wanted >= 1) this.heatLatched = true;
  }

  // Returns the dialogue to show when a stage completes, or null.
  onEvent(event, wanted = 0) {
    const st = this.stage;
    if (!st || st.event !== event) return null;
    if (event === 'lose-heat') {
      // Latch: only complete if heat was actually gained then lost.
      if (!(this.heatLatched && wanted === 0)) return null;
    }
    const dialogue = st.dialogue || null;
    this.heatLatched = false;
    this.stageIndex++;
    if (this.stageIndex >= this.job.stages.length) {
      this.completedJobs++;
      this.stageIndex = 0;
      this.jobIndex = Math.min(this.jobIndex + 1, JOBS.length - 1);
      return { jobComplete: true, dialogue };
    }
    return { jobComplete: false, dialogue };
  }

  setJob(jobIndex, stageIndex) {
    this.jobIndex = Math.max(0, Math.min(jobIndex, JOBS.length - 1));
    this.stageIndex = Math.max(0, Math.min(stageIndex, this.job.stages.length - 1));
  }
}
