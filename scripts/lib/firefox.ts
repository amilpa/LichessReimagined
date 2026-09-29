// Firefox names extension URLs moz-extension:// (and fills in the id in
// `__MSG_@@extension_id__` the same way Chrome does).

const CHROME_BASE = 'chrome-extension://__MSG_@@extension_id__/';
const FIREFOX_BASE = 'moz-extension://__MSG_@@extension_id__/';

export function toFirefoxCss(css: string): string {
  return css.replaceAll(CHROME_BASE, FIREFOX_BASE);
}

/** A Chrome URL left in a Firefox build would be a missing image there. */
export function assertNoChromeUrls(files: ReadonlyMap<string, string>): void {
  const left = [...files]
    .filter(([, text]) => text.includes('chrome-extension://'))
    .map(([name]) => name);
  if (left.length > 0) throw new Error(`chrome-extension:// URLs left in: ${left.join(', ')}`);
}
