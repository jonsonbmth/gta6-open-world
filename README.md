[![SOLMAR BAY on make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — A Golden Hour in Neon

An open-world crime game in the spirit of GTA 6, built for make.fun's **"Make GTA 6"** bounty ($1,666 in USDC).

Rico Marín is back in Solmar Bay — a sun-soaked coastal city at golden hour. Seven jobs. Five stars of heat. One red VULPINE S. Drive it home.

## Play it

Serve `game/` with any static HTTP server and open `game/index.html` in desktop Chrome. No network request is made: every script, image and sound the game loads is a file under `game/` (three.js is vendored as a minified build under `game/vendor/`).

```sh
cd game && python3 -m http.server 8123
# open http://localhost:8123/
```

## The game

- **Open world**: a dense coastal city — seven named districts, named streets, a beach and a marina with boats and crew, all explored on foot and by car.
- **Driving**: arcade handling with handbrake drift, a sculpted glossy hero car (VULPINE S) with a glowing full-width taillight bar, traffic cars to steal, and police units whose flashing light bars reflect red and blue on the asphalt.
- **Wanted system**: five stars, pursuit AI, near-miss bonuses, and a heat level that cools when you drive clean.
- **Missions**: the Sunset Sprint — six checkpoints across the city — plus a story in chapters with a crew (Lena "Wrench" Ortiz, Dario Voss, Mama Rosa) and dialogue.
- **HUD**: mission panel, wanted stars, cash, circular minimap with a live GPS route, radio, speed and gear — and a full city map (M) with districts, landmarks, GPS routing and a legend.
- **Save**: best drift, missions won and cash persist in localStorage.

## Controls

WASD / arrows drive · E enter & exit car · SPACE handbrake drift · SHIFT run · M city map · P pause · R radio · N mute

## Tech

- three.js r186 (vendored minified build under `game/vendor/`)
- Procedural everything: buildings, facades, streets, signs and textures are generated in code from a seed — no model or image files.
- `main.ts` (Node 22, stdlib only) copies `game/` + `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
