# SOLMAR BAY — A Night in the Rain

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built for make.fun's gta6-01 bounty.
Rico Marín is back in Solmar Bay — a neon coastal city in the middle of a storm.
Seven story jobs, five stars of heat, one red VULPINE S. Drive it home.

## Play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

No network, no build step. All art, textures, portraits and sound are generated
in code (canvas textures + WebAudio synthesis). three.js is vendored offline.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Drive / walk |
| E | Enter & exit car (steal any parked car) |
| Space | Handbrake |
| Shift | Run on foot |
| M | City map (GPS route, districts, landmarks) |
| R | Radio station (3 stations, synthesized) |
| F | Action (on foot) |
| Enter | Start from the title screen |

## What's in the game

- **Open city at night in the rain** — wet asphalt with fake neon reflections,
  dense neon shop signs on both sides of Solmar Avenue, palms, street lamps,
  a lit skyline, fog, rain streaks, and a marina with boats and docks.
- **Driving** — arcade handling in the hero VULPINE S (extruded fastback body,
  spoiler, full-width taillight bar) plus 6 traffic car types to steal.
- **On foot** — Rico in his yellow raincoat, pedestrians (some panic and run),
  the crew waiting at the marina.
- **Wanted 0–5 stars** — named police units (UNIT 7 / 12 / 21) chase in cars
  with flashing red/blue light bars; AIR-1 helicopter with a searchlight at 3+ stars.
- **7 story jobs** with stages, dialogue and portraits (Mama Rosa, Lena "Wrench"
  Ortiz, Dario "Fuze" Kane), objective beacon, GPS route on the map and minimap.
- **HUD** — mission panel, money + wanted stars, round minimap with police blips,
  radio + speedometer, floating NEAR MISS rewards.
- **Save / resume** — progress autosaves to localStorage and resumes at the exact
  job stage, never restarting a job.
- **City map** — district zones, named streets, bay + Pelican Isle + Harbor Bridge,
  8 landmarks, GPS route with distance + ETA, compass, legend, grid.
- **Playtest** — open `index.html?playtest=1` for a 20-check self-test.
- **Performance** — `?perf=low` renders at half resolution; HUD writes are cached
  and the minimap updates every 2nd frame.

## Layout

```
game/
  index.html            page + HUD
  src/
    main.js             boot, game loop, player, camera, playtest
    config.js           palette, names, districts, radio, jobs
    utils.js            seeded random, math, canvas helpers
    textures.js         canvas textures: facades, neon signs, portraits
    world.js            city, shops, palms, lamps, skyline, marina, rain
    cars.js             extruded-profile cars, police gear, traffic AI
    people.js           Rico, pedestrians, crew
    police.js           wanted system, pursuit, helicopter
    missions.js         7 jobs, stages, latching wanted stages
    hud.js              four-corner HUD, minimap, dialogue, map overlay
    citymap.js          the AAA city map
    audio.js            synthesized radio, engine, siren, rain
    save.js             localStorage save / resume
    input.js            keyboard, consume-on-read presses
    shots.js            frozen screenshot modes (chase / title / map / marina)
  vendor/three.min.js   three.js 0.160.0, vendored offline
```

Everything is original: our own city, characters, vehicles, names, story, art and
sounds. Nothing is taken from any commercial game.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
