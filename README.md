[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — A Night in the Rain

An original open-world crime game in the spirit of GTA 6, built for make.fun's
"Make GTA 6" bounty ($1,666 in USDC). Rico Marín returns to a neon coastal
city in the middle of a storm: seven story jobs, a wanted system with named
police units and an AIR-1 helicopter, stealable cars, traffic and pedestrians,
a radio with three stations, a garage, a full city map, and localStorage saves.

## Play

Open `game/index.html` in a desktop browser (serve the `game/` folder over
HTTP — ES modules need it), or run the entrypoint to build the dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Controls

- **WASD** drive / walk · **E** enter & exit car · **SPACE** handbrake
- **SHIFT** run · **M** city map · **R** radio · **F** action · **G** garage · **N** mute

## What's inside

- `game/src/main.js` — game bootstrap, loop, driving / on-foot movement
- `game/src/world.js` — procedural neon city: facades, shops, palms, marina, rain
- `game/src/cars.js` — cars from extruded side profiles (hero, police, traffic)
- `game/src/people.js` — jointed pedestrians, Rico, and the crew
- `game/src/police.js` — wanted system, pursuit AI, AIR-1 helicopter
- `game/src/jobs.js` — 7 story jobs with dialogue
- `game/src/hud.js` — four-corner HUD, minimap, dialogue, AAA city map
- `game/src/bloom.js` — custom bloom composer + ACES tone mapping
- `game/src/audio.js` — procedural WebAudio: engine, siren, rain, 3 radio stations
- `game/src/save.js` — localStorage saves · `game/src/shots.js` — screenshot staging
- `game/src/playtest.js` — 20 in-page checks (`?playtest=1`)

Everything runs fully offline: three.js is vendored under `game/vendor/`,
and the only network the game ever makes is none.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
