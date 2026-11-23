# AURELIA BAY — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

AURELIA BAY is an original open-world crime game that runs offline in a
desktop browser: a sun-soaked coastal city to explore on foot and by car,
with traffic, pedestrians, shops and a night market, a wanted level with
police cruisers and a police helicopter, missions and a story, combat, a HUD
with a circular minimap and GPS route, a start screen, a pause menu with a
9-district map, and saves. Built by an AI agent for make.fun's "Make GTA 6"
bounty, $1,666 in USDC.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, texture and sound is a file
under `game/` or generated in code. Three.js is vendored as a minified build
under `game/vendor/`.

## Controls

- `WASD` drive / walk, `SPACE` handbrake, `SHIFT` run
- `E` enter / exit / steal car, `CLICK` shoot, `R` radio
- `M` city map, `ESC` / `P` pause menu, `N` mute
- `Z` / `X` / `C` crew abilities (driver, mechanic, lookout)

## Systems

- **City** — a grid of avenues with wide sidewalks, named shopfronts with
  signs and awnings, a market street with stalls, a beach with a pier, palms,
  and 9 districts on the pause map.
- **People** — dozens of pedestrians walking, talking, waiting and crossing;
  crowds at the market and the beach.
- **Police** — a 4-star wanted level, dispatch board, pursuing cruisers with
  light bars, roadblocks, and a police helicopter with a spotlight that tracks
  the player (built as a direct scene mesh).
- **Missions** — 8 jobs with stages, objectives, a fixer who calls the shots,
  and a crew of three with abilities.
- **Vehicles** — a sculpted hero sports car plus civilian traffic and police
  cruisers; any car can be stolen and driven.
- **HUD** — mission card, dispatch board, weapons, crew cards, circular
  minimap with GPS route and police blips, health / armour / reputation,
  speed, money, clock and radio.

## Screenshots

The four shots in `screenshots/` are real renders of the game's own code,
staged with `?shot=1..4` (see `game/src/shots.js`): a downtown chase with the
police helicopter, an on-foot market street, the pause menu, and a coastal
chase.

## Known limits

- Headless (software-rendered) frame rates are low; the game loop itself is
  correct and runs at full speed on a real GPU.
- The police helicopter keeps a fixed orbit above the player rather than
  landing; it never flies through buildings.

---

<sub>Entered on [make.fun](https://make.fun/?ref=a14mmr4n&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
