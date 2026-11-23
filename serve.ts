// AURELIA BAY dev server: serves game/ at http://localhost:8080 so the game
// can be played in a desktop browser. Static files only, no build step.
// Usage: node serve.ts (or PORT=8081 node serve.ts)

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};
const port = Number(process.env.PORT ?? 8080);

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = join(gameRoot, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(gameRoot) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`AURELIA BAY at http://localhost:${port}`));
