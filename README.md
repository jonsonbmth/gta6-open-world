# SOLMAR BAY — A Night in the Rain

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jonsonbmth/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A gta6-01 entry: a playable open-world crime game in the browser. One rainy
night in Solmar Bay — a neon coastal city in a storm. Rico Marín and his crew
run seven story jobs while the Solmar Bay PD closes in.

Built by an AI agent for make.fun's "Build the best GTA VI-like open world"
bounty, $1,666 in USDC.

## Play

```sh
# serve the game folder, then open http://localhost:8123
python3 -m http.server 8123 --directory game
```

No build step, no network: three.js is vendored under `game/vendor/`, all
textures are generated in code, all audio is synthesized with WebAudio.

## The game

- **The city** — Solmar Bay: five avenues, five streets, a downtown skyline,
  a marina with piers and yachts, a bay with an island and a harbor bridge,
  30 neon-signed shops along Solmar Avenue, palms, lamps and a storm that
  never lets up. Rain, lightning, wet asphalt mirroring every light.
- **The look** — a custom bloom post-processing composer (authored from
  scratch, no vendored post-processing modules), ACES tone mapping, soft
  shadows, glossy car paint, additive glow under every lamp and sign. The
  scene is built to read clearly at a glance on a phone screen.
- **Rico Marín** — yellow raincoat, red cap. On foot or behind the wheel of
  the red VULPINE S. Enter any car with E; stealing one draws the heat.
- **7 story jobs** — First Run, Neon Errand, Hot Wheels, Rain Check, Harbor
  Lights, Midnight Oil, Solmar Bay. Stages with objectives, dialogue with
  portraits, rewards up to $6,000. Progress saves to localStorage and
  resumes at the exact job and stage.
- **Wanted 0–5 stars** — named patrol units with alternating red/blue light
  bars, roadblocks at high heat, and AIR-1, the police helicopter with a
  searchlight, from 3 stars. Lose the heat or get busted.
- **Traffic and people** — traffic AI on road loops, pedestrians with
  umbrellas who panic when shots ring out, near-miss bonuses (+$250) for
  threading traffic at speed.
- **HUD** — dense in all four corners: mission panel, money + wanted stars,
  round minimap with GPS route and police blips, speed + gear + radio.
  Three radio stations (VAPOR 101.3, SOLMAR GOLD 88.7, TIDE FM 94.2),
  all synthesized live.
- **City map (M)** — district zones, named streets, landmarks, GPS route
  with distance and ETA, compass, legend and grid.

## Controls

| Key | Action |
| --- | ------ |
| W / S / A / D or arrows | Drive / walk |
| Space | Handbrake (drift) |
| Shift | Run (on foot) |
| E | Enter / exit car |
| F | Shoot |
| M | City map |
| R | Next radio station |
| N | Mute |
| Enter | Start (title screen) |

## Verify

```sh
# playtest in a headless browser (20 checks, must be 20/20)
chromium --headless --dump-dom "http://localhost:8123/?playtest=1" --virtual-time-budget=20000

# screenshots (1280x720, each <= 256 KiB)
chromium --headless --screenshot=screenshots/1-chase.jpg --window-size=1280,720 \
  "http://localhost:8123/?shot=1-chase" --virtual-time-budget=20000
```

`?perf=low` halves the render resolution for slower machines.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22, standard library only. Two runs are byte-identical
(deterministic). `main.ts` copies `game/` and `screenshots/` and writes
`dossier.json` with the kit's `buildDossier`.

## License

MIT — see [LICENSE](LICENSE).
