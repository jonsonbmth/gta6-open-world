// SOLMAR BAY — story: 7 jobs with objectives, dialogue and GPS targets.
// All characters, places and lines are original.
import { CREW } from './config.js';

export const CHAPTERS = [
  {
    id: 1, title: 'First Run', giver: 'lena',
    brief: 'Drive to the garage on Palm Row',
    stages: [
      { text: 'Get in the VULPINE S', next: 'Press E near the red sports car', target: null, speaker: 'lena', line: "She's yours, Rico. Treat her like she owes you money." },
      { text: 'Drive to the garage on Palm Row', next: 'Follow the GPS route on the map', target: { x: -70, z: 80, label: 'PALM ROW PLAZA' }, speaker: 'lena', line: 'Two units on your tail, Rico — lose them on Palm Row!' },
      { text: 'Lose the heat', next: 'Stay out of sight until the stars drop', target: null, speaker: 'dario', line: 'Cops love the avenue. Take the back streets, amigo.' },
      { text: 'Park in the garage', next: 'Pull into the marked bay', target: { x: -70, z: 80, label: 'PALM ROW PLAZA' }, speaker: 'rosa', line: 'Tonight the city learns our name, Rico. Drive it home.' },
    ],
  },
  {
    id: 2, title: 'Harbour Lights', giver: 'rosa',
    brief: 'Meet the contact at the marina',
    stages: [
      { text: 'Meet the contact at the marina', next: 'Head east to the docks', target: { x: 96, z: 0, label: 'THE DOCKS' }, speaker: 'rosa', line: 'The man at the docks owes me a favour. Collect it.' },
      { text: 'Pick up the package', next: 'Press F at the crates', target: { x: 96, z: -10, label: 'DOCKSIDE YARD' }, speaker: 'dario', line: 'Heavy box. Whatever is inside, it hums.' },
      { text: 'Deliver it to Vela Market', next: 'Keep it under the speed limit. Or not.', target: { x: -60, z: -10, label: 'VELA MARKET' }, speaker: 'lena', line: 'If the cops sniff that box, we are all walking home.' },
    ],
  },
  {
    id: 3, title: 'Crown Heights', giver: 'dario',
    brief: 'A job in the towers — go quiet',
    stages: [
      { text: 'Reach Crown Tower', next: 'North end of the avenue', target: { x: -70, z: -95, label: 'CROWN TOWER' }, speaker: 'dario', line: 'The tower has eyes everywhere. Park two blocks out.' },
      { text: 'Find the roof access', next: 'On foot from here', target: { x: -70, z: -90, label: 'CROWN TOWER' }, speaker: 'lena', line: 'Roof door, third vent from the left. You are welcome.' },
      { text: 'Get back to the car', next: 'Do not run. Running is suspicious.', target: { x: -70, z: -80, label: 'CROWN HEIGHTS' }, speaker: 'rosa', line: 'Quiet feet, Rico. The whole city is listening.' },
    ],
  },
  {
    id: 4, title: 'Miramar Heat', giver: 'lena',
    brief: 'Outrun the beach patrol',
    stages: [
      { text: 'Reach Miramar Beach', next: 'East side, past the lighthouse road', target: { x: 55, z: -95, label: 'MIRAMAR BEACH' }, speaker: 'lena', line: 'Beach patrol is bored tonight. Give them a show.' },
      { text: 'Outrun the patrol', next: 'Three stars and counting — keep moving', target: null, speaker: 'dario', line: 'They cannot catch what they cannot see. Use the bridge!' },
      { text: 'Cross Harbor Bridge', next: 'Full throttle over the water', target: { x: 175, z: -60, label: 'HARBOR BRIDGE' }, speaker: 'rosa', line: 'The bridge is yours tonight. Take it.' },
    ],
  },
  {
    id: 5, title: 'The Old Pier', giver: 'rosa',
    brief: 'A deal at the old pier',
    stages: [
      { text: 'Meet at the Old Pier', next: 'South docks, past Dockside Yard', target: { x: 105, z: 55, label: 'OLD PIER' }, speaker: 'rosa', line: 'The pier crew respects one thing: showing up on time.' },
      { text: 'Watch for the ambush', next: 'Keep the engine running', target: null, speaker: 'lena', line: 'Two cars just parked wrong. That is never an accident.' },
      { text: 'Escape to Vela Quarter', next: 'Lose them in the market streets', target: { x: -60, z: -10, label: 'VELA MARKET' }, speaker: 'dario', line: 'I told you the pier was hot. Drive, Rico, drive!' },
    ],
  },
  {
    id: 6, title: 'Neon Run', giver: 'lena',
    brief: 'One lap of the avenue, flat out',
    stages: [
      { text: 'Line up on Solmar Avenue', next: 'South end, by Palm Row', target: { x: 0, z: 120, label: 'PALM ROW' }, speaker: 'lena', line: 'One lap. Avenue end to end. Loser buys the fuel.' },
      { text: 'Race to Crown Heights', next: 'Beat the clock — 90 seconds', target: { x: 0, z: -120, label: 'CROWN HEIGHTS' }, speaker: 'dario', line: 'I am timing you, and I am a harsh judge.' },
      { text: 'Return to the garage', next: 'Cool the brakes on the way back', target: { x: -70, z: 80, label: 'PALM ROW PLAZA' }, speaker: 'rosa', line: 'Fast is good. Fast and in one piece is better.' },
    ],
  },
  {
    id: 7, title: 'The Long Dusk', giver: 'rosa',
    brief: 'The last job — the whole city is watching',
    stages: [
      { text: 'Pick up Lena at the workshop', next: "Lena's Workshop, Dockside", target: { x: 60, z: 0, label: "LENA'S WORKSHOP" }, speaker: 'lena', line: 'Last job, Rico. After this, the city is ours.' },
      { text: 'Pick up Dario at Vela Market', next: 'He is waiting by the stalls', target: { x: -60, z: -10, label: 'VELA MARKET' }, speaker: 'dario', line: 'I brought snacks. And a plan. Mostly snacks.' },
      { text: 'The whole crew to the marina', next: 'Five stars if the cops catch on', target: { x: 96, z: 0, label: 'THE DOCKS' }, speaker: 'rosa', line: 'Everyone aboard. The sun is setting on the old Solmar Bay.' },
      { text: 'Watch the sunset', next: 'Park at the end of the pier', target: { x: 108, z: 55, label: 'OLD PIER' }, speaker: 'rosa', line: 'We made it, Rico. This city is ours now.' },
    ],
  },
];

export class Missions {
  constructor() {
    this.chapter = 0; // index into CHAPTERS
    this.stage = 0;
    this.completed = false;
    this.stageLatched = false; // 'wanted' stages must not auto-complete at 0 stars
  }

  current() { return CHAPTERS[this.chapter]; }
  currentStage() { return this.current().stages[this.stage]; }
  stageCount() { return this.current().stages.length; }

  objectiveText() { return this.currentStage().text; }
  nextText() { return this.currentStage().next; }

  // Advance one stage; returns 'stage' | 'chapter' | 'done'.
  advance() {
    this.stage++;
    this.stageLatched = false;
    if (this.stage >= this.current().stages.length) {
      this.chapter++;
      this.stage = 0;
      if (this.chapter >= CHAPTERS.length) {
        this.chapter = CHAPTERS.length - 1;
        this.stage = this.current().stages.length - 1;
        this.completed = true;
        return 'done';
      }
      return 'chapter';
    }
    return 'stage';
  }

  // Dialogue for the current stage.
  dialogue() {
    const st = this.currentStage();
    const who = CREW[st.speaker] || CREW.rosa;
    return { speaker: who.name, color: who.color, line: st.line, key: st.speaker };
  }

  // Serialize for save/resume: resume restores the exact stage (never restarts).
  serialize() { return { chapter: this.chapter, stage: this.stage, completed: this.completed }; }
  restore(data) {
    if (!data) return;
    this.chapter = Math.min(data.chapter ?? 0, CHAPTERS.length - 1);
    this.stage = Math.min(data.stage ?? 0, this.current().stages.length - 1);
    this.completed = !!data.completed;
  }
}
