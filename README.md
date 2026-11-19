[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — A Golden Hour in Neon

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
"Make GTA 6" bounty. A sun-drenched coastal Florida-style city at golden hour:
seven districts, a palm-lined beach boulevard, a marina, downtown towers,
traffic, pedestrians, police, and the Sunset Sprint checkpoint race — all
playable offline in a desktop browser from static files.

## Play it

Serve `game/` with any static HTTP server and open `game/index.html`:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no network request: three.js is vendored as the minified
`game/vendor/three.min.js`, and every texture, sound and model is generated
in code at run time.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Drive / walk |
| Space | Handbrake drift |
| E | Enter / exit a car (walk up to a traffic car to steal it) |
| F | Punch (on foot) |
| M | City map (districts, street names, GPS route) |
| P / Esc | Pause |
| R | Reset car to Ocean Drive |
| N | Sound on/off |

## What's in the city

- **Driving** — arcade physics with drift scoring, a low 3/4 chase camera, and
  a sculpted bright-red hero sports car (extruded body, spoked wheels,
  full-width taillight bar, diffuser, dual exhausts).
- **On foot** — get out, walk the sidewalks, punch a pedestrian (the cops
  will notice), steal any traffic car.
- **Wanted system** — stars rise with crimes; police interceptors chase with
  flashing light bars and sirens. Stand still next to them and you're busted.
- **Sunset Sprint** — a six-checkpoint timed race across all seven districts,
  with cash prizes and a countdown.
- **The map** — a full city map with district zones, street names, a GPS route
  to the next checkpoint, compass and legend, plus a live minimap.
- **The marina** — docked boats with rounded hulls and a three-person crew on
  the piers.
- **Sound** — a fully synthesized WebAudio soundscape: engine, tyre screech,
  sirens, chimes. No audio files.
- **Save** — cash, best drift and missions won persist in localStorage.

## Layout

```
game/
  index.html            page, HUD, title screen, map overlay
  vendor/three.min.js   three.js 0.186.1, minified (MIT, see three-LICENSE.txt)
  src/
    main.js             game loop, camera, driving + on-foot play
    config.js           city plan, tuning, palette
    world.js            city, beach, ocean, marina builder
    cars.js             hero/traffic/police cars + driving physics
    people.js           pedestrians + marina crew
    traffic.js          traffic loops
    police.js           wanted system + pursuit AI
    missions.js         Sunset Sprint + drift scoring
    hud.js              HUD, minimap, city map
    render.js           renderer, golden-hour light rig, bloom
    audio.js            synthesized WebAudio sound
    input.js            keyboard + mouse
    random.js           seeded RNG
    save.js             localStorage save
    shots.js            ?shot= setups + built-in 20-check playtest
main.ts                 entry program: copies game/ + screenshots/ to /output
                        and writes dossier.json with buildDossier
shots.json              the four screenshot setups
screenshots/            1-chase, 2-title, 3-map, 4-marina
```

Run the built-in playtest with `?playtest=1` — it exercises the real game
code and reports 20 checks on `window.__playtest`.

## License

MIT — see [LICENSE](LICENSE). Three.js is MIT-licensed by the Three.js
authors; see `game/vendor/three-LICENSE.txt`.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
