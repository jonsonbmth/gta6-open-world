[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — a night neon-rain open-world crime game

Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

**SOLMAR BAY** is a complete open-world crime game set in a rain-soaked neon coastal
city at night. You are Rico Marín, a wheelman pulled back for one last job by Mama
Rosa, with Lena "Wrench" Ortiz on comms and Dario "Fuze" Kane riding shotgun.

## What is in the game

- **A city to explore on foot and by car** — five districts (Lumen Strip, Marina del
  Sol, Vista Heights, Old Harbour, Coral Docks), a curved ring highway, a bay with
  Pelican Isle, and a working marina. All original: our own names, characters,
  vehicles, story, art and sounds.
- **Driving** — stealable cars with arcade handling, drifting, near-miss bonuses, a
  garage that keeps what you steal, and a hero car, the VULPINE S.
- **Police** — a 0–5 star wanted system with named units (UNIT 7, UNIT 12, UNIT 21),
  roadblocks at 3 stars, and the AIR-1 helicopter with a searchlight at 4.
- **Missions** — 7 story jobs with staged objectives, dialogue with portraits,
  payouts in cash and respect.
- **Life** — traffic AI, pedestrians who panic and run when a chase comes through,
  rain, neon shop signs, palms, and three procedural radio stations.
- **HUD** — dense four-corner HUD with a round rotating minimap, a full AAA city map
  (M), save/load in localStorage, and a start screen.

## Controls

| Key | Action |
| --- | --- |
| W / S | Accelerate / brake (on foot: move) |
| A / D | Steer (on foot: strafe) |
| Space | Handbrake / drift |
| E | Enter / exit car |
| F | Punch (on foot) |
| M | City map |
| R | Next radio station |
| P | Pause / save |
| H | Horn |

## Play it

Serve `game/` with any static file server and open `index.html` in desktop Chrome.
Everything runs offline: three.js is vendored under `game/vendor/`, all textures are
generated in code, and all sound is synthesized with WebAudio. No network request.

`?perf=low` halves the render resolution on weaker machines.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
