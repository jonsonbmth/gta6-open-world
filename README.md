# SOLMAR BAY — A Golden Hour in Neon

[![Play on make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

**Rico Marín is back in Solmar Bay** — a sun-soaked coastal city at golden hour. Seven story jobs, five stars of heat, one red VULPINE S. Drive it home.

## What is in the game

- A complete open world: downtown avenues, the canal district, the marina, Pelican Isle, the harbour bridge, beaches and the ring highway.
- Driving and walking: steal any car, enter and exit with E, traffic AI, pedestrians who panic and run when the heat is on.
- Wanted 0–5 stars with named police units (UNIT 7, UNIT 12, UNIT 21) and the AIR-1 helicopter with a searchlight.
- 7 story jobs with objectives, GPS routes, dialogue and a save that resumes where you left off.
- A dense HUD: mission tracker, money, wanted stars, speed, radio (3 stations), a round minimap with real streets, and a full AAA city map (M).
- Golden-hour look: natural blue-to-gold sky, warm sunlight that lights the hero car from the camera side, procedural textures everywhere, real bloom, ACES tone mapping, shadows, vignette and film grain.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080. WASD drive / walk, E enter or exit a car, SPACE handbrake, SHIFT run, M city map, R radio, F action, N mute.

## Shots

The four screenshots in `screenshots/` are staged renders of the real game (`?shot=chase|title|map|marina&seed=1`), captured with a headless browser and reviewed by hand.

## Layout

- `game/` — the playable game as static files (three.js 0.160.0 vendored under `game/vendor/`).
- `game/src/` — one file per system: config, world, cars, people, police, missions, HUD, audio, save, post-processing, shots, playtest.
- `main.ts` — hands the game and screenshots in and writes `dossier.json` with the make.fun library.
- `serve.ts` — a tiny static server for local play.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
