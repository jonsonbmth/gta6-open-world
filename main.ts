// SOLMAR BAY entrypoint (Node 22, standard library only): hands the game in.
// Copies this directory's game/ and screenshots/ into the output directory
// and writes /output/dossier.json with make.fun's own vendored library, the
// same file the scorer runs byte for byte. Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Fail fast with a clear message if the game entry page is missing, instead
// of handing in a dossier for an unplayable entry.
if (!existsSync(join(out, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing from the entry');
}

// The scorer's caps, kept in one place: 4 screenshots max, 256 KiB each;
// game/ under 993 files and 48 MiB; dossier text capped at 160 KiB.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
