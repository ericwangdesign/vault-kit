#!/usr/bin/env node
/* Screenshots for the writing canvas, from headless Chrome. No dependencies: it talks to Chrome over its debug port.

   node canvas/shot.mjs <url> <out.jpg> [--w 1440] [--h 900] [--scale 2] [--theme dark|light]
                        [--el <css selector>] [--nth 0] [--full] [--wait 600] [--quality 84] [--click <css selector>]

   --el crops to one element (the nth match). --full takes the whole page. The theme is set the way the vault sets it,
   with the `theme` cookie, and prefers-color-scheme follows it. Prints the image's true pixel size, for `w` and `h`,
   and says so if the page scrolls sideways. */
import { writeFileSync } from 'node:fs';
import { launch, sleep } from './chrome.mjs';

const argv = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < argv.length; i++) argv[i].startsWith('--') ? (opt[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true) : pos.push(argv[i]);
const [url, out] = pos;
if (!url || !out) { console.error('usage: shot.mjs <url> <out.jpg> [--w 1440] [--h 900] [--scale 2] [--theme dark|light] [--el sel] [--nth 0] [--full]'); process.exit(2); }
const W = +(opt.w || 1440), H = +(opt.h || 900), SCALE = +(opt.scale || 2), THEME = opt.theme || 'dark';

let chrome;
try {
  chrome = await launch();
  const { send, evalJs } = chrome;
  await chrome.open(url, { w: W, h: H, scale: SCALE, theme: THEME, wait: +(opt.wait || 900) });

  // --click presses something first (a Slide button, a tab), for a shot of that state.
  if (opt.click) { await evalJs(`(() => { const b = document.querySelector(${JSON.stringify(opt.click)}); b && b.click(); return 1; })()`); await sleep(700); }
  let clip;
  // Walk down the page first so lazy pictures load and stop shifting what's under them, then come back up.
  if (opt.el || opt.full) await chrome.walk();
  if (opt.el) {
    const r = await evalJs(`(() => { const el = document.querySelectorAll(${JSON.stringify(opt.el)})[${+(opt.nth || 0)}]; if (!el) return null;
      el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
    if (!r) throw new Error('No element matches ' + opt.el);
    await sleep(400);
    clip = { ...r, scale: 1 };
  } else if (opt.full) {
    const h = await evalJs('document.documentElement.scrollHeight');
    clip = { x: 0, y: 0, width: W, height: h, scale: 1 };
  }
  const shot = await send('Page.captureScreenshot', { format: out.endsWith('.png') ? 'png' : 'jpeg', quality: out.endsWith('.png') ? undefined : +(opt.quality || 84), clip, captureBeyondViewport: !!clip });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  const w = Math.round((clip ? clip.width : W) * SCALE), h = Math.round((clip ? clip.height : H) * SCALE);
  const over = await evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
  console.log(`${out}  ${w}x${h}` + (over > 0 ? `  OVERFLOWS by ${over}px` : ''));
} catch (e) {
  console.error(String(e.message || e));
  process.exitCode = 1;
} finally {
  if (chrome) await chrome.close();
}
