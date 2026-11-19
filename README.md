# SOLMAR BAY — A Night in the Rain? No. A Dusk in Neon.

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built by an AI agent
for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

**SOLMAR BAY** — Rico Marín is back in Solmar Bay, a neon coastal city at
golden dusk. Seven story jobs with Mama Rosa, Lena "Wrench" Ortiz and Dario
"Fuze" Kane. Drive the red VULPINE S through streets lined with neon shops,
outrun the Solmar Bay police (wanted 0–5 stars, AIR-1 helicopter), steal cars,
walk the marina, and watch the sun go down over Pelican Isle.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No network needed — three.js is vendored offline under `game/vendor/`.

- **WASD** drive / walk · **E** enter & exit car · **SPACE** handbrake ·
  **SHIFT** run · **M** city map · **R** radio · **F** action · **N** mute
- Progress saves to localStorage automatically; resume continues the job.

## What is in the game

- A full 3D city: Solmar Avenue, Crown Heights, Miramar, Vela Quarter,
  Dockside, Palm Row, Harbour Lights, the marina, Pelican Isle, Harbor Bridge.
- Traffic AI, walking pedestrians with realistic proportions, police pursuit
  with named units and a searchlight helicopter, combat, radio stations,
  garage, and a complete HUD with minimap and dialogue.
- Dusk art direction: warm golden-hour sky, procedural textures on every
  surface (asphalt, brick, concrete, facades), sculpted cars with clearcoat
  paint, bloom + vignette + film grain post-processing.

## Layout

- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)
- `game/index.html` — page, HUD, title screen, map overlay
- `game/src/` — one file per system: `config`, `textures`, `world`, `cars`,
  `people`, `police`, `missions`, `audio`, `save`, `hud`, `shots`, `bloom`,
  `input`, `playtest`, `main`
- `game/vendor/three.module.min.js` — three.js 0.160.0 (vendored)
- `screenshots/` — 4 screenshots of the game itself (cover first)

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
