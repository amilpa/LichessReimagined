// A profile's flag as an emoji, from Lichess's flag codes (ISO country codes,
// a few regions, and its own `_`-prefixed ones).

const SPECIAL_FLAGS: ReadonlyMap<string, string> = new Map([
  ['GB-ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['GB-SCT', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['GB-WLS', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['_rainbow', '🏳️‍🌈'],
  ['_transgender', '🏳️‍⚧️'],
  ['_pirate', '🏴‍☠️'],
  ['_united-nations', '🇺🇳'],
  ['_earth', '🌍'],
]);

// Regional indicator A is U+1F1E6.
const REGIONAL_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0);

// A two-letter code maps to regional indicators. A code without an emoji
// (Lichess's own flag, most regions) shows nothing.
export function flagEmoji(code: string | undefined): string {
  if (code === undefined) return '';
  const special = SPECIAL_FLAGS.get(code);
  if (special !== undefined) return special;
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(
    REGIONAL_OFFSET + code.charCodeAt(0),
    REGIONAL_OFFSET + code.charCodeAt(1),
  );
}
