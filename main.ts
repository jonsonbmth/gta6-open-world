// SOLMAR BAY — gta6-01 entry program (Node 22, standard library only).
//
// The game lives in this repository's game/ folder: plain static files that a
// desktop browser loads offline (game/index.html plus its scripts, three.js
// vendored under game/vendor/, no network request). This program hands the
// entry in: it copies game/ and screenshots/ beside this file into the output
// directory and writes dossier.json there with the kit's buildDossier library,
// the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with any static server pointed at game/.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Never ship a dossier for a missing or empty game: fail loudly instead.
if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the entry cannot be built.');
}
if (!existsSync(join(repoRoot, 'screenshots', '1-chase.jpg'))) {
  throw new Error('screenshots/1-chase.jpg is missing — capture the cover first.');
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps: dossier text capped at 160 KiB; at most 4 screenshots of
// 256 KiB each; game/ at most 993 files and 48 MiB, paths at most 1000 bytes.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
console.log(`SOLMAR BAY dossier written: ${dossierBytes.length} bytes -> ${join(outputDir, 'dossier.json')}`);
