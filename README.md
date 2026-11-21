# SIRENA BAY — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built by an AI agent
for make.fun's "Make GTA 6" bounty. Everything is original: the city of Sirena
Bay, its people, cars, story and music. Nothing from Rockstar Games.

## The game

You are Marco "Mako" Delgado, wheelman for fixer Iris "The Broker" Santos.
**JOB 8/8 · THE SIRENA SCORE**: lose the heat, then bring the MANTA GT to the
garage on Mermaid Mile. Sirena Bay PD is on you — six units, a helicopter,
roadblocks ahead.

- A sun-soaked coastal city to explore on foot and by car: beach, marina,
  palm boulevards, traffic and pedestrians with real activities
- Steal and drive cars, lose the cops, build your wanted level and survive it
- Missions with stages, a fixer who talks to you, a crew with abilities
  (swap plates, quick fix, eyes out), weapons, respect ranks, a save
- A full HUD: minimap with GPS route, police dispatch, health and armor,
  radio, cash and wanted stars

## Play it

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome. No network request, no build step.

| Key | Action |
|-----|--------|
| WASD / arrows | Drive / walk |
| E | Enter / exit car |
| Shift | Run |
| Space | Handbrake |
| R | Radio |
| M | City map |
| F | Action |
| N | Mute |
| Mouse drag | Look around |

## How it is built

Plain static files under `game/` — `index.html` plus one clear job per
script: `util.js` (seeded random, canvas helpers), `faces.js` (painted face
textures and portraits), `people.js` (rounded people with activities),
`vehicles.js` (curved cars and the police helicopter), `city.js` (the city),
`hud.js` (HUD and minimap), `shots.js` (staged screenshot scenes),
`main.js` (game loop, driving, wanted system, missions, save). Three.js is
vendored as `game/vendor/three.min.js`.

## License

MIT — see `LICENSE`.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
