// SOLMAR BAY — the entry program (Node 22, standard library only). It copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. It refuses to build a dossier from a broken repo: no game, no shots,
// or an oversized screenshot fails loudly here instead of at submission.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing — refusing to build a dossier without the game');
}
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
  : [];
if (shots.length < 4) {
  throw new Error(`only ${shots.length} screenshot(s) in screenshots/ — this entry needs 4`);
}
for (const shot of shots) {
  const bytes = statSync(join(shotsDir, shot)).size;
  if (bytes > 262144) {
    throw new Error(`screenshot ${shot} is ${bytes} bytes — over the 256 KiB cap`);
  }
}
// The grader caps /output at 1000 entries; game/ may hold at most 993 of them.
function countEntries(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    count += 1;
    if (entry.isDirectory()) count += countEntries(join(dir, entry.name));
  }
  return count;
}
const gameEntries = countEntries(gameDir);
if (gameEntries > 993) {
  throw new Error(`game/ holds ${gameEntries} entries — over the 993 cap`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`dossier written to ${dossierPath} (${statSync(dossierPath).size} bytes, ${shots.length} screenshots, ${gameEntries} game entries)`);
