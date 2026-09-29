/** The page's language, as Lichess sets it on <html> (`fr`, `en-US`…). */
export const pageLang = (): string => document.documentElement.lang;

export const isFrench = (): boolean => pageLang().startsWith('fr');

/** The page's language for `Intl`, or undefined (the browser's) when the page sets none. */
export function pageLocale(): string | undefined {
  const lang = pageLang();
  // Intl throws on an empty locale.
  return lang === '' ? undefined : lang;
}
