# SOLMAR BAY — Night Rain

An open-world crime game for make.fun's "Make GTA 6" bounty (gta6-01), $1,666 in USDC.

Rico Marín is a getaway driver in Solmar Bay, a neon coastal city in the middle
of a night storm. Seven story jobs with Mama Rosa, Lena "Wrench" Ortiz and Dario
"Fuze" Kane. Steal cars, outrun the SBPD, lose the helicopter, upgrade your ride
at Lena's garage, and save the city one wet night at a time.

## Play

```sh
node serve.ts   # http://localhost:8080
```

WASD drive & walk · E enter/exit car · F punch · Click shoot · 1–5 weapons ·
R radio · M map · G garage · P pause · Space handbrake · Shift sprint.

## What is in the game

- **A city to explore** — Lumen Avenue's neon shopfronts, Downtown towers,
  Westside and Eastside blocks, the Old Harbour marina with docks and boats.
- **Night rain** — falling rain, wet asphalt with fake neon reflections, fog,
  glowing signs, palm silhouettes, a gradient night sky.
- **Traffic and pedestrians** — cars that drive the grid, people with umbrellas
  who run screaming when a chase passes.
- **Wanted 0–5 stars** — named SBPD units (UNIT 7, UNIT 12, UNIT 21…) that
  pursue, ram and roadblock; AIR-1 helicopter with a searchlight at 3+ stars.
- **7 story jobs** with stages, objectives, crew dialogue and portraits.
- **Combat** — fists, pistol, SMG, shotgun, rifle; health and armour.
- **Garage** — engine, armour, repair, repaint, fake plates.
- **HUD** — mission panel, police response panel, money/stars/weapons, round
  rotating minimap, health/armour/REP, dialogue, radio + speedometer.
- **Sound** — synthesized WebAudio: engine, sirens, rain, three radio stations.
- **Save** — localStorage, autosaves after every job.

## Tech

three.js 0.160.0 (vendored, `game/vendor/three.module.min.js`), ES modules, no
build step, fully offline. All art is procedural — canvas-drawn signs, window
grids and portraits; no external assets.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.
