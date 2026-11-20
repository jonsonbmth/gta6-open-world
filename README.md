# SOLMAR BAY — A Golden Hour in Neon

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game built for make.fun's **"Make GTA 6"** bounty ($1,666 in prizes).
Drive a bright red sports car through Solmar Bay — seven districts, one golden-hour sunset.
Steal cars, outrun the police, and chase the orange rings of the Sunset Sprint.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any static file server).
Everything runs offline: three.js is vendored as `game/vendor/three.min.js`, no network requests.

| Key | Action |
| --- | --- |
| WASD / Arrows | Drive |
| Space | Handbrake drift |
| E | Enter / exit a car |
| F | Punch (on foot) |
| M | City map (districts, GPS route, compass, legend) |
| P | Pause |
| R | Reset the car |
| N | Toggle sound |

## The city

- **Seven districts** — Old Town, Downtown, Solmar Beach, Palm Row, Harbor Heights, Sunset Flats, Marina Bay — each with its own streets, buildings and character.
- **Sunset Sprint** — six checkpoints across the city against the clock, with cash rewards.
- **Wanted level** — five stars; three police cars with flashing light bars chase you when you're wanted.
- **Traffic and pedestrians** — twelve cars on the streets, twenty pedestrians on the sidewalks, three crew on the marina dock.
- **Marina Bay** — six boats with coloured hulls and white cabins moored at wooden piers.
- **Save / load** — cash, best drift and missions won persist between sessions.

## How it is built

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/index.html` — the game shell and HUD.
- `game/src/` — one file per job: `config` (city, palette, physics), `world` (sky, streets, buildings, marina), `cars` (hero, traffic, police, boats), `people` (pedestrians, crew), `render` (renderer, chase camera, hero light), `missions` (Sunset Sprint), `police`, `traffic`, `hud` (HUD, minimap, city map), `audio` (procedural sound), `save`, `input`, `main` (game loop, physics, drift), `shots` (screenshot scenarios).
- `game/vendor/three.min.js` — three.js r186, minified, vendored with its license.

## License

MIT — see `LICENSE`.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
