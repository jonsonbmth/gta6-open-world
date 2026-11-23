// AURELIA BAY — the gta6-01 entrypoint (Node 22, standard library only).
//
// The game is the static game/ directory beside this file: a three.js open
// world that runs offline in a desktop browser (game/index.html plus classic
// scripts, one vendored library, no network request of any kind). This
// program stages that directory and the screenshots/ renders into the output
// directory and writes dossier.json — the summary the judge reads — with the
// vendored make.fun library.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (competition gate.json): only text_max_bytes shapes
// the dossier's bytes; the rest refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB; more than 993 files in game/
// or 48 MiB of game files in all; a path under game/ over 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function clearDirectory(path: string): void {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function stageEntry(sourceDir: string, targetDir: string): void {
  clearDirectory(targetDir);
  cpSync(join(sourceDir, 'game'), join(targetDir, 'game'), { recursive: true });
  const shots = join(sourceDir, 'screenshots');
  if (existsSync(shots)) {
    cpSync(shots, join(targetDir, 'screenshots'), { recursive: true });
  }
}

function main(): void {
  stageEntry(REPO_ROOT, OUTPUT_DIR);
  if (!existsSync(join(OUTPUT_DIR, 'game', 'index.html'))) {
    throw new Error('staging failed: game/index.html missing from the output');
  }
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log(`Aurelia Bay staged in ${OUTPUT_DIR} (${dossier.length} byte dossier).`);
}

main();
