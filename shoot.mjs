// Screenshot + playtest driver for SOLMAR BAY.
// Serves game/, opens each ?shot= in headless Chromium (Playwright),
// screenshots at 1280x720, and fails loudly on console/page errors.
// Usage: node shoot.mjs [--shots-only|--playtest-only]
import { chromium } from '/tmp/pw/node_modules/playwright-core/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, 'game');
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const errors = [];
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return page;
}

const only = process.argv[2];
if (only !== '--playtest-only') {
  for (const s of shots) {
    const page = await newPage();
    await page.goto(base + '/' + s.query, { waitUntil: 'networkidle' });
    await page.waitForTimeout(s.wait_ms);
    const path = join(here, 'screenshots', s.name);
    await page.screenshot({ path, type: 'jpeg', quality: 82 });
    const { size } = await import('node:fs').then((fs) => fs.statSync(path));
    console.log(`shot ${s.name}: ${(size / 1024).toFixed(0)} KiB`);
    await page.close();
  }
}

if (only !== '--shots-only') {
  // Playtest: title → Enter → walk → enter car → drive → radio → exit → map → pause
  const page = await newPage();
  await page.goto(base + '/?seed=7', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const log = [];
  const state = () => page.evaluate(() => ({
    mode: document.getElementById('hud').classList.contains('hidden') ? 'title?' : 'hud-on',
    title: !document.getElementById('title-screen').classList.contains('hidden'),
    money: document.getElementById('sp-money')?.textContent,
    speed: document.getElementById('vp-speed-n')?.textContent,
    car: document.getElementById('vp-car')?.textContent,
  }));
  log.push('start: ' + JSON.stringify(await state()));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  log.push('after Enter: ' + JSON.stringify(await state()));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(900); await page.keyboard.up('KeyW');
  log.push('walked: ' + JSON.stringify(await state()));
  await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
  log.push('after E: ' + JSON.stringify(await state()));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  log.push('drove: ' + JSON.stringify(await state()));
  await page.keyboard.press('KeyR'); await page.waitForTimeout(300);
  log.push('radio: ' + JSON.stringify(await page.evaluate(() => document.getElementById('vp-station')?.textContent)));
  await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
  log.push('after exit E: ' + JSON.stringify(await state()));
  await page.keyboard.press('KeyM'); await page.waitForTimeout(400);
  log.push('map open: ' + JSON.stringify(await page.evaluate(() => !document.getElementById('map-screen').classList.contains('hidden'))));
  await page.keyboard.press('KeyM'); await page.waitForTimeout(300);
  await page.keyboard.press('KeyP'); await page.waitForTimeout(400);
  log.push('pause open: ' + JSON.stringify(await page.evaluate(() => !document.getElementById('pause-menu').classList.contains('hidden'))));
  await page.keyboard.press('KeyP'); await page.waitForTimeout(300);
  await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
  log.push('punched, errors so far: ' + errors.length);
  for (const l of log) console.log('playtest:', l);
  await page.close();
}

console.log(errors.length ? `ERRORS (${errors.length}):\n- ${errors.join('\n- ')}` : 'NO PAGE/CONSOLE ERRORS');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
