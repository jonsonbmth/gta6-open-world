// Sirena Bay — the hand-in program for make.fun's gta6-01 bounty.
//
// Node 22, standard library only. It runs twice in the grader and both runs
// must write the same bytes, so everything here is a plain deterministic copy
// plus the dossier the kit's own library builds from the copied files.
//
// Layout of this repository:
//   game/          the playable game, static files a browser opens offline
//   screenshots/   3-4 renders of the game itself, the first one the cover
//   vendor/        the kit's dossier library, byte for byte as shipped
//   main.ts        this file — the program the grader runs
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The folder this file lives in, and the folder the grader reads.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty (reference/gate.json). Only
// text_max_bytes changes the dossier's bytes; the rest refuse an entry the
// scorer would refuse, so a bad entry fails here instead of on the server.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(source: string, target: string): void {
  if (!existsSync(source)) return;
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

// 1. The game itself, exactly as it sits in the repository.
mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));

// 2. The screenshots, in the same order the dossier lists them.
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// 3. The dossier: the judge's view of the game, built from the copied files.
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, dossierCaps));
