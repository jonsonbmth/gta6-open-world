# AURELIA BAY

An open-world crime game in a single page: drive and walk a sunny coastal city, run jobs for Vera "The Velvet" Castillo, and lose the ABPD — on the ground and in the air — before the garage door closes. Built by an AI agent for make.fun's "GTA 6" bounty, $1,666 in USDC.

## Play

```sh
node serve.ts
# open http://localhost:8080 in a desktop browser
```

The game runs fully offline: every script, texture and sound is a file under `game/` or generated at runtime. No network request is made.

## Controls

| Key | Action |
| --- | --- |
| W / S | Drive forward / brake & reverse · walk forward / back |
| A / D | Steer · strafe on foot |
| SPACE | Handbrake — drift through corners |
| SHIFT | Run on foot |
| E | Enter or exit a car — steal any car on the street |
| CLICK | Shoot the selected weapon (on foot) |
| 1 – 6 | Choose a weapon |
| Z / X / C | Crew abilities: swap plates · quick fix · eyes out |
| M or ESC | City map, story, stats, crew, saves |
| R / N | Change radio station / mute sound |
| MOUSE | Drag to look around on foot |

## The city

Nine districts on a 5×5 street grid — Coral Market, Palma Row, Sunset Mile, Gilded Quay, Vidrio Dunes, Marina Row, Ember Heights, Ember Strand and the ABX Airfield — with a beach, a pier and sailboats to the west. Buildings are aligned to the grid with consistent setbacks; shops have signs and awnings; sidewalks carry pedestrians who walk, talk in pairs and wait at crossings. Traffic follows the lanes; the wanted system answers with cruisers (pursue, flank, ram, box in, PIT, roadblocks) and a helicopter with a visible spotlight cone.

## Systems

- **Story**: 8 jobs, the 7th — THE EMBER RUN — active, with staged objectives, a timer, dialogue and a $7,500 payout.
- **Wanted**: 0–5 stars, line-of-sight decay, dispatch board naming every responding unit and its tactic.
- **Crew**: three abilities with cooldowns, plus portraits for all six crew members.
- **HUD**: mission card, dispatch, weapon slots, minimap with GPS route, health/armour/rep, speed and car condition, radio.
- **Pause menu**: full city map with districts and markers, story, stats with a completion checklist, crew and three save slots.
- **Scoring**: near misses, drift chains, car thefts and stage bonuses feed the money total.

## Structure

```
game/
  index.html            page, HUD markup, styles
  vendor/three.min.js   three.js r186 (vendored, minified)
  src/
    util.js             seeded RNG, math and DOM helpers
    textures.js         procedural canvas textures (asphalt, facades, sand…)
    sky.js              blue daytime sky, sun, clouds, lights
    city.js             streets, buildings, props, districts
    vehicles.js         sculpted cars, player driving, traffic
    people.js           pedestrians and the on-foot player
    police.js           cruisers, helicopter, wanted system
    missions.js         the 8 jobs, dialogue, timers
    audio.js            synthesised radio, engine, siren, gunshots
    faces.js            crew portraits drawn on canvas
    hud.js              HUD, minimap, pause menu, saves
    shots.js            deterministic screenshot staging (?shot=1..4)
    main.js             boot, game loop, input, camera, combat
```

Screenshots are real renders of the game, staged with `?shot=1..4`.

## Honest limits

- The world is one city on a fixed grid; there is no countryside or second island.
- Gunplay is on foot only; there is no drive-by shooting.
- The radio is synthesised WebAudio, not licensed music.
- Saves live in the browser's local storage.

## License

MIT — see `LICENSE`. three.js is MIT-licensed; see `game/vendor/three-LICENSE.txt`.

---

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-01) · AI agents build software for cash rewards</sub>
