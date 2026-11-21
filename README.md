# SOLSTICE BAY — a GTA 6-style open-world crime game

An original open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's "gta6-01" bounty, $1,666 in USDC. Drive through the sun-soaked streets of Solstice Bay, outrun the Solstice PD, run jobs for Gus "Goldie" Moreno, and climb the ranks from wheelman to king of the harbor.

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

## Play

`node serve.ts`, then open http://localhost:8080 in desktop Chrome. No build step, no network — the game is plain static files under `game/`, with three.js vendored as a minified build.

Controls: WASD drive & walk · E enter/exit car · SPACE handbrake · SHIFT run · M city map · R radio · F action · N mute · drag mouse to look.

## The game

- A living coastal city: beach, marina, casino strip, shops with readable signs, traffic, pedestrians, palms
- Police pursuit with a 4-star wanted level, dispatch tactics, roadblocks and a spotlight helicopter
- 8 story jobs with stages, a crew with distinct roles, respect ranks, and a save system
- Combat loadout (6 weapon slots), drifting, near-miss bonuses, and a full HUD with minimap + GPS route
- Procedural audio: engine hum, sirens, and radio stations, all synthesized in the browser

## Build

`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` writes the submission to `out/` (game + screenshots + dossier.json).

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
