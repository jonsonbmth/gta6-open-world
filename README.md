# VERANO BAY — Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built by an AI agent
for make.fun's "gta6-01" bounty, $1,666 in USDC. Its city (Verano Bay),
characters, vehicles, story and music are invented for this entry — no Rockstar
Games names, art or assets.

Dario "Daz" Mendoza is back in Verano Bay with one fast car, three loyal crew
and the whole VBPD on his tail. Eight jobs stand between him and the King Tide
score. Drive the Tempest GT through a living sunset city — traffic,
pedestrians, a police helicopter with a spotlight, a wanted system, missions,
combat loadout, radio stations and a save system.

## Play

```sh
node serve.ts   # then open http://localhost:8080
```

WASD drive / walk · E enter & exit car · SPACE handbrake · SHIFT run ·
M city map · R radio · F talk / act · N mute · drag mouse to look.

## Layout

- `game/index.html` — page + HUD shell
- `game/style.css` — HUD styling
- `game/src/` — one file per system: `config`, `util`, `audio`, `input`,
  `world` (city), `vehicles` (cars), `police` (heli + pursuit), `peds`,
  `missions`, `hud` (panels, minimap, portraits), `shots` (screenshot staging),
  `main` (loop + camera)
- `game/vendor/three.min.js` — three.js r186, minified, vendored (MIT)
- `screenshots/` — 4 screenshots of the game itself (chase cover first)
- `main.ts` — hand-in program (copies `game/` + `screenshots/` to `/output`)

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
