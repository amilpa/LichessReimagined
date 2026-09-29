import { existsSync } from 'node:fs';
import path from 'node:path';

// Where the build under test is, and how Chromium must be launched to load it.

/**
 * The unpacked extension: dist/chrome, or the folder CDC_EXTENSION_DIR names.
 * A private build keeps a `pnpm dev` running elsewhere from reloading the
 * extension, and the tabs with it, in the middle of a run.
 */
export const EXTENSION_DIR = path.resolve(
  process.env['CDC_EXTENSION_DIR'] ??
    path.join(import.meta.dirname, '..', '..', '..', 'dist', 'chrome'),
);

/** Fails early, rather than with every test timing out on an unstyled page. */
export function assertBuilt(): void {
  if (!existsSync(path.join(EXTENSION_DIR, 'manifest.json')))
    throw new Error(`No extension in ${EXTENSION_DIR}: build it first (pnpm build).`);
}

// Lichess serves its mobile layout to headless Chrome's own user agent.
export const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export const LAUNCH_ARGS: readonly string[] = [
  `--disable-extensions-except=${EXTENSION_DIR}`,
  `--load-extension=${EXTENSION_DIR}`,
  '--mute-audio',
];

/** What the extension's own files are served from. */
export const EXTENSION_ORIGIN = 'chrome-extension://';
