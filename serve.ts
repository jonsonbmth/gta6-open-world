// Tiny static server for local playtesting: serves game/ at :8080.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.txt': 'text/plain',
};
const port = Number(process.env.PORT || 8080);
createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let p = join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(port, () => console.log('VERANO BAY at http://localhost:' + port));
