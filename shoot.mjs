// Playtest + screenshot tool for SOLMAR BAY V5. Run from the repo root:
//   node shoot.mjs
// Serves game/ on localhost, drives the game with Playwright, checks for
// console/page errors, and writes the 4 staged screenshots (1280x720 JPEG).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';

const require = createRequire('/tmp/pw/package.json');
const { chromium } = require('playwright-core');
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';

const PORT = 8091;
const BASE = `http://localhost:${PORT}`;
const SHOTS = [
  { name: '1-chase.jpg', query: '?shot=chase&seed=1' },
  { name: '2-title.jpg', query: '?shot=title&seed=1' },
  { name: '3-map.jpg', query: '?shot=map&seed=1' },
  { name: '4-marina.jpg', query: '?shot=marina&seed=1' },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + '/index.html');
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('server did not come up');
}

const server = spawn('node', ['serve.ts'], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});

const errors = [];
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

try {
  await waitServer();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  // --- playtest on the plain page ---
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 30000 });
  check('page loads, game ready', true);
  await page.keyboard.press('Enter');
  await sleep(1200);
  const hudVisible = await page.evaluate(() => !document.getElementById('hud').classList.contains('hidden'));
  check('title -> Enter starts game, HUD shows', hudVisible);
  await page.keyboard.down('KeyW');
  await sleep(6000);
  await page.keyboard.up('KeyW');
  const speed = await page.evaluate(() => window.__game.state.speedKmh);
  check('W drives the car', speed > 5, `speed ${speed.toFixed(0)} km/h`);
  await page.keyboard.press('KeyE');
  await sleep(800);
  const onFoot = await page.evaluate(() => window.__game.state.onFoot);
  check('E exits the car (on foot)', onFoot === true);
  await page.keyboard.down('KeyW');
  await sleep(10000);
  await page.keyboard.up('KeyW');
  const walked = await page.evaluate(() => window.__game.rico.position.z);
  check('W walks on foot', Math.abs(walked - 60) > 1, `rico z=${walked.toFixed(1)}`);
  await page.keyboard.press('KeyE');
  await sleep(800);
  const backInCar = await page.evaluate(() => window.__game.inCar);
  check('E re-enters the car', backInCar === true);
  await page.keyboard.press('KeyR');
  await sleep(400);
  const station = await page.evaluate(() => window.__game.state.radioStation);
  check('R changes radio station', station === 1, `station ${station}`);
  await page.keyboard.press('KeyM');
  await sleep(600);
  const mapOpen = await page.evaluate(() => window.__game.mode === 'map');
  check('M opens the city map', mapOpen);
  await page.keyboard.press('KeyM');
  await sleep(400);
  await page.keyboard.press('KeyP');
  await sleep(500);
  const paused = await page.evaluate(() => window.__game.mode === 'pause');
  check('P pauses', paused);
  await page.keyboard.press('KeyP');
  await sleep(400);
  await page.keyboard.press('KeyF');
  await sleep(300);
  check('F punch (no crash)', true);
  await page.mouse.click(640, 360);
  await sleep(400);
  const ammo = await page.evaluate(() => window.__game.state.ammo[1]);
  check('Click shoots (ammo decreases)', ammo < 24, `pistol ammo ${ammo}`);
  await page.keyboard.press('Digit3');
  await sleep(300);
  const weapon = await page.evaluate(() => window.__game.state.weapon);
  check('Digit 3 selects SMG', weapon === 2, `weapon ${weapon}`);
  await page.keyboard.press('KeyG');
  await sleep(500);
  const garage = await page.evaluate(() => window.__game.mode === 'garage');
  check('G opens the garage', garage);
  await page.keyboard.press('KeyG');
  await sleep(400);
  const resumed = await page.evaluate(() => window.__game.mode === 'play');
  check('G closes the garage', resumed);
  check('no console/page errors during playtest', errors.length === 0, errors.slice(0, 3).join(' | '));

  // --- screenshots ---
  for (const shot of SHOTS) {
    await page.goto(BASE + '/' + shot.query, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 90000 });
    await sleep(2000);
    const path = `screenshots/${shot.name}`;
    await page.screenshot({ path, type: 'jpeg', quality: 80 });
    const bytes = statSync(path).size;
    check(`screenshot ${shot.name} <= 256 KiB`, bytes <= 262144, `${Math.round(bytes / 1024)} KiB`);
  }
  check('no console/page errors during shots', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
} finally {
  server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed, ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
