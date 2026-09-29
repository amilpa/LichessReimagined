// Lichess's own globals, as the page world sees them. They're untyped
// JavaScript objects: read them as `unknown` and narrow with a schema.

declare global {
  interface Window {
    site?: unknown;
    i18n?: unknown;
  }
}

export const readSite = (): unknown => window.site;

/** A string of Lichess's `site` translations, or `fallback` if it's missing. */
export function translate(key: string, fallback: string): string {
  const table = window.i18n;
  if (typeof table !== 'object' || table === null || !('site' in table)) return fallback;
  const site: unknown = table.site;
  if (typeof site !== 'object' || site === null || !(key in site)) return fallback;
  const value: unknown = Reflect.get(site, key);
  return typeof value === 'string' ? value : fallback;
}
