// SOLMAR BAY — gta6-01 entrypoint (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun library.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loud instead of handing in a broken entry: the game must exist and
// all four screenshots must be present (the V9 lesson, baked in).
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('refusing to build a dossier: game/index.html is missing');
}
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => !f.startsWith('.'))
  : [];
if (shots.length < 4) {
  throw new Error(`refusing to build a dossier: only ${shots.length} screenshot(s), need 4`);
}
const badShot = shots.find((f) => !/\.(png|jpe?g)$/i.test(f));
if (badShot) {
  throw new Error(`refusing to build a dossier: screenshot ${badShot} is not a PNG or JPEG`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse. Verified
// 2026-11-19: dossier 954,152 bytes, byte-identical across two runs.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
