[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# AURELIA BAY — An Open-World Crime Game

Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

AURELIA BAY is a complete open-world crime game in the browser: the sun-soaked
city of Ember Strand, explored on foot and by car, with traffic and
pedestrians, a wanted level and police who respond to it, missions and a
story, combat, a HUD with a minimap, a start screen and a save. It runs
from plain static files under `game/` — no build step, no network request.

## The job

Dante "Dusk" Reyes, wheelman for Vera "The Velvet" Castillo, is running
JOB 7/8 — THE EMBER RUN: lose the ABPD heat, then deliver the DORADO GT
to Vera at the Gilded Quay. Six ABPD units are on the street (FALCON-2,
OSPREY-7, HERON-4, KITE-9, the AIR-3 helicopter and a roadblock), the
wanted level is four stars, and the garage is three minutes away.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `index.html`.

## Controls

| Key | Action |
| --- | --- |
| W / S | Accelerate / brake |
| A / D | Steer |
| SPACE | Handbrake |
| E | Enter / exit the car |
| SHIFT | Run (on foot) |
| M | City map (Esc closes it) |
| R | Radio station |
| N | Mute |
| Mouse drag | Look around |

Progress (money, rep, stage) saves to the browser automatically; CONTINUE
on the title screen picks it up again.

## What is in the world

- **Ember Strand**: Sunset Mile with textured asphalt, crosswalks,
  sidewalks, flush rows of buildings with shopfronts, signs and striped
  awnings, palms, power lines, billboards and a distant skyline.
- **The marina**: beach, water, a plank pier, sailboats and the six-person
  crew at the Gilded Quay.
- **Vehicles**: the hero DORADO GT (a sculpted sports sedan — bezier side
  profile, glasshouse, spoked wheels, wing spoiler, LED tail bar), four
  ABPD cruisers with light bars, parked cars, and the AIR-3 helicopter
  with a spotlight cone.
- **People**: 36 pedestrians with real proportions and faces, walking,
  talking, phoning, carrying and waving on both sidewalks.
- **Systems**: wanted level, police pursuit, dispatch feed, weapons,
  crew cards, minimap, full city map with 9 districts, radio, engine
  sound, save / continue.

## Tech

Three.js (vendored as `game/vendor/three.min.js`, r186) with procedural
canvas textures throughout — asphalt, facades, awnings, pavers, sand,
water, pier planks, signs and billboards are all generated in code, so
the game needs no image files. The source is split into files with one
clear job each under `game/src/`: `util`, `textures`, `sky`, `vehicles`,
`people`, `faces`, `city`, `hud`, `shots`, `main`.

## Screenshots

`screenshots/` holds four renders of the game itself: the chase (cover),
the title screen, the city map and the marina crew.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
