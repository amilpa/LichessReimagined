// Builds the Firefox version of the extension into dist/firefox (or the
// folder given): the same files, with what Firefox reads differently.
//
//   node tools/firefox/build.mjs [out] [--version <x.y.z>]
//
// - The background: Firefox runs no extension service worker, only
//   background scripts (an event page).
// - The gecko block: an id (Firefox keeps an extension's storage under it,
//   and AMO signs by it), the oldest version (the page-world content scripts
//   need 128, the data collection field 140 on desktop and 142 on Android),
//   and no data collected.
// - The CSS: the rules load bundled images from
//   chrome-extension://__MSG_@@extension_id__/…, which Firefox names
//   moz-extension://. It fills in the id the same way.
//
// No dependencies: Node 22 only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILES = ['manifest.json', '_locales', 'icons', 'img', 'lib', 'sounds', 'src'];
const GECKO_ID = 'lichessdotcom@theophile-wallez.github.io';
const MIN_VERSION = '140.0';
const MIN_ANDROID_VERSION = '142.0';

const args = process.argv.slice(2);
const at = args.indexOf('--version');
const version = at >= 0 ? args.splice(at, 2)[1] : null;
const out = path.resolve(args[0] || path.join(ROOT, 'dist/firefox'));

fs.rmSync(out, { recursive: true, force: true });
for (const f of FILES) fs.cpSync(path.join(ROOT, f), path.join(out, f), { recursive: true });

const manifestPath = path.join(out, 'manifest.json');
const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (version) m.version = version;
m.background = { scripts: [m.background.service_worker] };
m.browser_specific_settings = {
  gecko: {
    id: GECKO_ID,
    strict_min_version: MIN_VERSION,
    data_collection_permissions: { required: ['none'] },
  },
  gecko_android: { strict_min_version: MIN_ANDROID_VERSION },
};
fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n');

let rewritten = 0;
for (const css of m.content_scripts.flatMap(c => c.css || [])) {
  const file = path.join(out, css);
  const text = fs.readFileSync(file, 'utf8');
  const next = text.replaceAll('chrome-extension://__MSG_@@extension_id__/', 'moz-extension://__MSG_@@extension_id__/');
  if (next !== text) rewritten++;
  fs.writeFileSync(file, next);
}
// A URL left with the Chrome scheme would be a blank image in Firefox.
const left = fs
  .readdirSync(path.join(out, 'src'), { recursive: true })
  .filter(f => /\.(css|js)$/.test(f))
  .filter(f => fs.readFileSync(path.join(out, 'src', f), 'utf8').includes('chrome-extension://'));
if (left.length) throw new Error('chrome-extension:// URLs left in: ' + left.join(', '));

console.log(`${out}: Firefox ${MIN_VERSION}+, ${rewritten} stylesheets rewritten`);
