// AURELIA BAY — a tiny static server for local play (Node 22, stdlib only).
// Serves the game/ directory at http://localhost:8080 (or $PORT). The game
// itself makes no network requests; this server only exists so a browser can
// load the files from disk without file:// restrictions on module scripts.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const PORT = Number(process.env.PORT ?? 8080);

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const target = join(GAME_DIR, path === '/' ? 'index.html' : path);
  if (!target.startsWith(GAME_DIR) || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream' });
  createReadStream(target).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Aurelia Bay at http://localhost:${PORT} — open it in a desktop browser.`);
});
