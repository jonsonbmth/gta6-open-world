[![Make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — Make GTA 6

An original open-world crime game in the spirit of GTA 6, set in the rain-soaked
neon city of **Solmar Bay** at night. Drive the vivid red **VULPINE S** down
Lumen Avenue, outrun named police units under the AIR-1 helicopter spotlight,
take on 7 story jobs with Rico Marín and his crew, and explore a living coastal
city — traffic, panicking pedestrians, a marina, garages, radio, and a full
AAA city map.

Built with three.js (vendored offline), zero network requests, zero assets
downloaded at run time. Everything is procedural: the city, the cars, the
people, the neon, the rain, the radio.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| W / S | Drive / brake · walk forward / back |
| A / D | Steer · strafe |
| E | Enter / exit car |
| Space | Handbrake / sprint |
| M | City map |
| R | Radio station |
| J | Advance mission dialogue |
| Enter | Start game |

## What's in the world

- **Night neon rain** — purple-blue sky, wet asphalt with stretched neon and
  police-light reflections, rain streaks, warm haze, fake bloom from additive
  glow sprites.
- **Open city** — five named districts, a curved ring highway, the Old Harbour
  marina, Pelican Isle offshore, palm-lined boulevards, 4 building types with
  lit windows, dense neon shopfronts.
- **Cars** — extruded-profile bodies (low nose, sloped hood, trapezoid glass
  cabin, fastback + wing spoiler), traffic AI, stealable cars, the VULPINE S
  hero car with a full-width glowing taillight bar.
- **Wanted system** — 0–5 stars, named units (UNIT 7 / 12 / 21), pursuit AI,
  AIR-1 helicopter with a visible searchlight cone.
- **Story** — 7 numbered jobs with dialogue and character portraits (Rico,
  Mama Rosa, Lena "Wrench" Ortiz, Dario "Fuze" Kane), save/load via
  localStorage, garage, respect progression.
- **HUD** — mission panel, money + wanted stars, round minimap, radio +
  speedometer, floating action text (NEAR MISS, DRIFT).

## Layout

- `game/` — the game (index.html + ES modules under `src/`, three.js vendored
  under `game/vendor/`).
- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json` with the kit's `buildDossier`.
- `screenshots/` — 4 screenshots (chase cover, title, city map, marina).

## Entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
