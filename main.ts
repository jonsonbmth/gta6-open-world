// SPDX-License-Identifier: MIT
// AURELIA BAY — the entrypoint for gta6-01 (Node 22, standard library only).
// It publishes the game: copies game/ and screenshots/ beside this file into
// the output directory and writes dossier.json there, the summary the judge
// reads, using the vendored make.fun library. Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader's container MAKEFUN_OUTPUT_DIR is unset and /output is used.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The scorer's own caps: only text_max_bytes shapes the dossier bytes; the
// rest refuse an entry the scorer would refuse (more than 4 screenshots, one
// over 256 KiB, more than 993 files or 48 MiB under game/, a game path over
// 1000 bytes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

async function publish() {
  await mkdir(outDir, { recursive: true });
  await cp(join(root, "game"), join(outDir, "game"), { recursive: true });
  await mkdir(join(outDir, "screenshots"), { recursive: true });
  if (existsSync(join(root, "screenshots"))) {
    await cp(join(root, "screenshots"), join(outDir, "screenshots"), { recursive: true });
  }
  const dossier = buildDossier(outDir, CAPS);
  await writeFile(join(outDir, "dossier.json"), dossier);
  console.log(`AURELIA BAY published to ${outDir} (${dossier.byteLength} byte dossier)`);
}

publish().catch((err) => {
  console.error("publish failed:", err);
  process.exit(1);
});
