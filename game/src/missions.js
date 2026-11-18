// Story: 7 jobs for Rico Marín and his crew, each with stages + dialogue.
export const CREW = {
  lena: { name: 'LENA "WRENCH" ORTIZ', role: 'mechanic', skin: '#c98a5a', hair: '#ff2d95', shirt: '#2a6aff' },
  rosa: { name: 'MAMA ROSA', role: 'fence', skin: '#8a5a34', hair: '#e8e8e8', shirt: '#7a2a4a' },
  dario: { name: 'DARIO "FUZE" KANE', role: 'demolitions', skin: '#f2c89a', hair: '#1c1c28', shirt: '#2a7a5a' },
  rico: { name: 'RICO MARÍN', role: 'getaway driver', skin: '#c98a5a', hair: '#1c1c28', shirt: '#ffd23e' },
};

export const JOBS = [
  {
    chapter: 'CH 1', title: 'THE GETAWAY DRIVER',
    desc: 'Lena needs the Comet out of the impound lot. Get it back to the garage in one piece.',
    stages: ['Reach the impound lot', 'Steal the Comet', 'Lose the cops', 'Deliver to the garage'],
    crew: 'lena',
    lines: [
      'Lose them before the bridge, Rico. The Comet is worth more than my freedom — barely.',
      'That car is my retirement plan. Do not scratch the paint. Actually, scratch it. Just bring it home.',
    ],
    pay: 2400,
  },
  {
    chapter: 'CH 1', title: 'WET WORK',
    desc: 'Dario wired a job at the Old Harbour. Pick up the package — no questions.',
    stages: ['Meet Dario at the marina', 'Grab the package', 'Reach the safehouse'],
    crew: 'dario',
    lines: [
      'Package is in the blue container, Pier 9. Do not open it. Seriously.',
      'If anyone follows you, the harbour is deep and the night is long. You get me?',
    ],
    pay: 1800,
  },
  {
    chapter: 'CH 2', title: 'MAMA ROSA\'S FAVOUR',
    desc: 'Rosa has a buyer for hot jewellery. Collect it from the Gilded Pawn, fast and quiet.',
    stages: ['Reach the Gilded Pawn', 'Collect the jewellery', 'Deliver to Rosa'],
    crew: 'rosa',
    lines: [
      'My buyer pays in cash, no names. You are my favourite grandson tonight, Rico.',
      'The pawn man talks too much. Smile, take the bag, leave before he finishes a sentence.',
    ],
    pay: 3200,
  },
  {
    chapter: 'CH 2', title: 'NEON RUN',
    desc: 'A rival crew is moving product down Lumen Avenue. Intercept the courier van.',
    stages: ['Find the courier van', 'Ram it off the road', 'Take the cargo'],
    crew: 'lena',
    lines: [
      'The van is armoured, so hit it where it lives — the rear axle. Physics does the rest.',
      'If the van makes the bridge, we lose the cargo and the night. Do not let it.',
    ],
    pay: 4100,
  },
  {
    chapter: 'CH 3', title: 'THE DOWNTOWN DROP',
    desc: 'Dario planted something under the Halcyon Motel. Drive the decoy, draw the heat.',
    stages: ['Pick up the decoy car', 'Draw police downtown', 'Escape to the marina'],
    crew: 'dario',
    lines: [
      'The decoy is loud on purpose. Every cop in Solmar Bay should want a piece of you.',
      'When the sky lights up, do not look back. Looking back is how drivers get caught.',
    ],
    pay: 5000,
  },
  {
    chapter: 'CH 3', title: 'HARBOUR LIGHTS',
    desc: 'Rosa\'s shipment arrives by ferry at midnight. Escort the truck through Westside.',
    stages: ['Meet the ferry', 'Escort the truck', 'Defend the drop'],
    crew: 'rosa',
    lines: [
      'The truck carries my whole month. Guard it like it is your own mother, Rico.',
      'Westside is hungry tonight. Keep your eyes on the mirrors and your foot down.',
    ],
    pay: 6400,
  },
  {
    chapter: 'CH 4', title: 'THE LONG GOODBYE',
    desc: 'One last job: the vault under the Mirage Hotel. Then Rico leaves Solmar Bay rich.',
    stages: ['Reach the Mirage', 'Crack the vault', 'Outrun the whole city', 'Reach the bridge'],
    crew: 'lena',
    lines: [
      'Seven jobs, Rico. This is the last one. After tonight, Solmar Bay is a postcard.',
      'The whole city will be behind you. Drive like the rain owes you money.',
    ],
    pay: 12000,
  },
];

export function currentJob(state) {
  return JOBS[Math.min(state.jobIndex, JOBS.length - 1)];
}

export function stageLabel(state) {
  const job = currentJob(state);
  return `STAGE ${Math.min(state.jobStage + 1, job.stages.length)}/${job.stages.length}`;
}

export function nextObjective(state) {
  const job = currentJob(state);
  return job.stages[Math.min(state.jobStage, job.stages.length - 1)];
}

// Advance one stage; returns { completedJob, finishedStory, pay }.
export function advanceStage(state) {
  const job = currentJob(state);
  state.jobStage += 1;
  if (state.jobStage >= job.stages.length) {
    state.money += job.pay;
    state.respect = Math.min(1000, state.respect + 90);
    state.respectLevel = Math.min(5, 1 + Math.floor(state.respect / 200));
    state.jobsDone += 1;
    const finishedStory = state.jobIndex >= JOBS.length - 1;
    if (!finishedStory) {
      state.jobIndex += 1;
      state.jobStage = 0;
    }
    return { completedJob: true, finishedStory, pay: job.pay };
  }
  return { completedJob: false, finishedStory: false, pay: 0 };
}
