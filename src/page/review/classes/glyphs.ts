import type { MoveClass } from './classes.ts';

// The class icons' white glyphs, drawn over a disc in a 20 x 20 viewBox:
// round-capped strokes, and a few solid shapes.

/** One path of a glyph: its `d`, stroked, or filled when solid. */
export interface GlyphPath {
  readonly path: string;
  readonly solid: boolean;
}

const stroke = (path: string): GlyphPath => ({ path, solid: false });
const solid = (path: string): GlyphPath => ({ path, solid: true });

const round = (value: number): number => Math.round(value * 100) / 100;

// A dot is a zero-length line: its round cap draws it.
const DOT_Y = 14.6;
const STEM_END = 11.4;

/** An exclamation mark centered on `x`. */
const exclamation = (x: number): GlyphPath => stroke(`M${x} 5V${STEM_END}M${x} ${DOT_Y}v0`);

/** A question mark centered on `x`, its hook of the given radius. */
function question(x: number, radius: number): GlyphPath {
  const centerY = round(5 + radius);
  const diagonal = round(radius * Math.SQRT1_2);
  const hookEnd = { x: round(x + diagonal), y: round(centerY + diagonal) };
  const stemTop = round(centerY + radius + 0.6);
  return stroke(
    `M${round(x - radius)} ${centerY}A${radius} ${radius} 0 1 1 ${hookEnd.x} ${hookEnd.y}` +
      `C${round(hookEnd.x - diagonal / 2)} ${round(hookEnd.y + diagonal / 2)} ${x} ${round(stemTop - 1)} ${x} ${stemTop}` +
      `V${STEM_END}M${x} ${DOT_Y}v0`,
  );
}

/** A five-pointed star around (10, 10.4). */
function star(): GlyphPath {
  const corners = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? 5.6 : 2.4;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    return `${round(10 + radius * Math.cos(angle))} ${round(10.4 + radius * Math.sin(angle))}`;
  });
  return solid(`M${corners.join('L')}Z`);
}

export const CLASS_GLYPHS: Readonly<Record<MoveClass, readonly GlyphPath[]>> = {
  brilliant: [exclamation(7.2), exclamation(12.8)],
  great: [exclamation(10)],
  book: [
    solid('M9.3 6.6C7.9 5.6 6 5.3 4.3 5.6v8.6c1.8-.3 3.6 0 5 1z'),
    solid('M10.7 6.6c1.4-1 3.3-1.3 5-1v8.6c-1.8-.3-3.6 0-5 1z'),
  ],
  best: [star()],
  // A thumb up: the cuff, then the hand.
  excellent: [
    solid('M4.6 9.3h2.3v6.4H4.6z'),
    solid(
      'M8.2 9.3 10.3 5c1.1 0 1.8.9 1.6 2l-.4 1.8h2.9c1 0 1.7.9 1.5 1.9l-.9 3.8c-.2.7-.8 1.2-1.5 1.2H8.2z',
    ),
  ],
  good: [stroke('M5.8 10.3l2.9 2.9 5.6-6')],
  inaccuracy: [question(7.6, 2.3), exclamation(13.6)],
  mistake: [question(10, 2.3)],
  miss: [stroke('M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8')],
  blunder: [question(6.8, 1.9), question(13.2, 1.9)],
};
