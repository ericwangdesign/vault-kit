/* Headless Chrome for the canvas's tools, with no dependencies: it talks to Chrome over its debug port. shot.mjs takes
   pictures with it; check.mjs --layout opens each page at a phone's width and a desktop's and measures what it drew. */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// CHROME overrides. On a Mac it's the app in /Applications; elsewhere `google-chrome` on the PATH.
const CHROME = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  const port = 9300 + Math.floor(Math.random() * 500), dir = mkdtempSync(join(tmpdir(), 'cvshot-'));
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + port, '--user-data-dir=' + dir, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(100);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) { proc.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = pending.get(d.id); if (p) { pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  await send('Network.enable');
  await send('Page.enable');

  // Walk down the page and back up, so lazy pictures load and stop moving what's under them.
  const walk = () => evalJs('(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 500)); return 1; })()');
  // Open a page at a width and theme and wait for its fonts; `walk` also loads every picture.
  async function open(url, { w = 1440, h = 900, scale = 2, theme = 'dark', wait = 900, load = false } = {}) {
    const u = new URL(url);
    await send('Network.setCookie', { name: 'theme', value: theme, domain: u.hostname, path: '/' });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: w < 600 });
    await send('Page.navigate', { url });
    await sleep(wait);
    await evalJs('document.fonts ? document.fonts.ready.then(() => 1) : 1');
    await sleep(250);
    if (load) await walk();
  }
  function close() { try { ws.close(); } catch {} proc.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
  return { send, evalJs, open, walk, close };
}
