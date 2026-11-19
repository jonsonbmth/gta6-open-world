// SOLMAR BAY — gta6-01 entry program (Node 22, standard library only).
//
// The game lives in game/ as plain static files: game/index.html opens in
// desktop Chrome and plays offline — three.js is vendored as the minified
// game/vendor/three.min.js, and every other asset is generated in code, so
// the game makes no network request at all.
//
// This program hands the entry in: it copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json with
// the kit's buildDossier, the same library the scorer uses to rebuild it.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps: the dossier text budget plus the limits that would
// refuse an entry (screenshots, game size, path lengths).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
