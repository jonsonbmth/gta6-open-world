# gta6-open-world

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**AURELIA BAY** — a 3D open-world crime game in the browser. Drive a sculpted
GT coupe through a sunlit coastal city, lose the police helicopter, work eight
jobs for fixer Vera Solano, and own the bay. Built with three.js (vendored
locally, no network requests) and plain HTML/CSS/JS — no build step.

## The city

- **One continuous street network** — the roads are a single asphalt surface
  with painted lane markings; sidewalks run only along the building lines,
  and the boulevard's center divider is a hedge of green bushes.
- **Downtown, market and coast** — Sunset Mile boulevard, Coral Market street
  with stalls and string lights, Aurelia Blvd along the beach with palms, a
  lifeguard tower and umbrellas, plus 9 named districts on the pause map.
- **Living streets** — 110+ pedestrians with realistic proportions walking the
  sidewalks, talkers in pairs, beachgoers, 26 ambient traffic cars, and 36
  named shops with signs, awnings and goods.
- **Police** — a 5-star wanted system, pursuing cruisers with light bars, and
  a police helicopter with a visible spotlight cone that tracks you from
  above the rooftops.

## Play

- **Drive** the red Aurelia GT coupe (WASD, SPACE handbrake for drifts),
  **walk** as Dante Vale (SHIFT to run, CLICK to shoot), **enter and exit**
  the car with E.
- **8 jobs** with objective beacons and a GPS route on the circular minimap;
  near-miss and drift bonuses pay out in-game cash.
- **Full HUD** — mission card, police dispatch board, crew cards with
  portraits, health/armor/reputation bars, speedometer, radio, and dialogue.
- **Pause menu (M)** — city map with all 9 districts, story, stats, crew,
  and save slots (localStorage).
- **Procedural audio** — engine hum, police siren, two chiptune radio
  stations and effects, all synthesized with WebAudio (N mutes).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or publish the entry with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — page, HUD and pause menu
- `game/src/` — one file per system: `main` (loop, driving, camera),
  `city` (streets, blocks, shops, market, beach), `vehicles` (sculpted cars,
  traffic), `people` (articulated pedestrians, crowds), `heli`, `police`
  (wanted system, pursuit), `missions` (jobs, dialogue, beacons), `hud`
  (minimap, pause menu), `faces` (crew portraits), `audio` (WebAudio),
  `shots` (screenshot staging), `sky`, `trees`, `textures`, `util`
- `game/vendor/three.min.js` — three.js r186, vendored locally (MIT)
- `screenshots/` — the 4 dossier screenshots (cover first by name)
- `main.ts` — publishes game/ + screenshots/ and writes dossier.json

## Honest limits

- Single-player and offline; no multiplayer, no save sync between devices.
- Traffic follows straight lanes and does not stop at lights; pedestrians
  walk fixed sidewalk paths.
- The helicopter is a visual pursuer — it tracks and spotlights you, it does
  not shoot.

---

<sub>Entered on [make.fun](https://make.fun/?ref=a14mmr4n&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software on make.fun</sub>
