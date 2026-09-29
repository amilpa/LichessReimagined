// The hover card's ratings (styles/powertip/header.css), one chip each.

/** A rating's text without Lichess's column padding (no-break spaces). */
export const ratingText = (text: string): string => text.replaceAll('\u00a0', '').trim();

/** Unrated ("?") and never played ("-") chips are dimmed. */
export const ratingState = (text: string): 'none' | 'rated' =>
  text === '?' || text === '-' ? 'none' : 'rated';
