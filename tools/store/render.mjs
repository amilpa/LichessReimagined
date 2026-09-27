// Renders the Chrome Web Store's images: every page in tools/store becomes
// store/<name>.png, at the size its <meta name="size"> gives. A page with a
// <meta name="icons"> is the extension's icon instead: icons/icon<n>.png at
// each size it lists.
//
// The repo has no dependencies: install Playwright in a throwaway folder
// (`npm i playwright` in /tmp/cdc-store) and point PLAYWRIGHT at it:
//   PLAYWRIGHT=/tmp/cdc-store/node_modules/playwright/index.mjs node tools/store/render.mjs [name…]

import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../store');
mkdirSync(out, { recursive: true });

const only = process.argv.slice(2);
const pages = readdirSync(here)
  .filter(f => f.endsWith('.html'))
  .filter(f => !only.length || only.includes(f.replace(/\.html$/, '')));

const browser = await chromium.launch({ channel: 'chromium' });
for (const file of pages) {
  const html = readFileSync(join(here, file), 'utf8');
  const [w, h] = html.match(/<meta name="size" content="(\d+)x(\d+)">/).slice(1).map(Number);
  const name = file.replace(/\.html$/, '');
  const icons = html.match(/<meta name="icons" content="([\d,]+)">/)?.[1].split(',').map(Number);
  for (const size of icons || [w]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: size / w });
    await page.goto(pathToFileURL(join(here, file)).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const path = icons ? join(here, `../../icons/icon${size}.png`) : join(out, `${name}.png`);
    await page.screenshot({ path, omitBackground: !!icons });
    await page.close();
    console.log(`${path.replace(join(here, '../../'), '')}  ${size}×${Math.round(h * size / w)}`);
  }
}
await browser.close();
