# CORAL VISTA — a golden-hour open-world crime game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**CORAL VISTA** is an original open-world crime game set in a sun-soaked coastal
city at golden hour. Drive a stolen sports car down Coral Avenue with a police
helicopter overhead, lose the heat, and bring the car home to the garage.

## What is in the game

- **A living city**: beach boulevard with palms, umbrellas and a ferris wheel,
  shops with readable signs, crosswalks, traffic lights, traffic and
  pedestrians (some of them panicking when the chase rolls past).
- **A real police chase**: a helicopter with a visible spotlight, 6 CVPD units
  on a live dispatch board (callsigns, tactics, distances), police cruisers
  with flashing light bars and red/blue glow on the asphalt, roadblocks.
- **Story missions with stages**: 8 jobs, stage progress, timers, GPS routes
  and checkpoints, save slots, and a crew with abilities.
- **Systems**: wanted stars, health and armour, respect ranks, weapon slots,
  car condition, drift scoring, near-miss bonuses, radio, and a full city map
  (M) with districts, landmarks and career stats.
- **On foot and by car**: walk the marina with the crew, steal any car,
  drive it home.

## How to play

Serve `game/` with any static file server and open `game/index.html` in
desktop Chrome. No network requests, no build step.

- **WASD** drive / walk · **E** enter & exit car · **SPACE** handbrake ·
  **SHIFT** run · **M** city map · **R** radio · **F** action · **N** mute

## How it was built

Three.js (vendored as a minified build under `game/vendor/`), plain ES
modules with one clear job per file, procedural canvas textures, and a
WebAudio synth for engine, sirens and radio stingers. Every name, character,
street, shop, mission and line of dialogue is original.

Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,000 in USDC.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
