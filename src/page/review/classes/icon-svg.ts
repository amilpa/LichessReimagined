import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, type MoveClass } from './classes.ts';
import { CLASS_GLYPHS } from './glyphs.ts';

// A class's icon: a shadowed circle in its color, and white glyphs whose
// shadow is the same glyphs half a unit lower.

const BREAK = '\n      ';

function buildSvg(moveClass: MoveClass): SafeHtml {
  const glyphs = CLASS_GLYPHS[moveClass].map(path => html`<path d="${path}"/>`);
  const shadowOpacity = moveClass === 'book' ? 0.3 : 0.2;
  const glyphFill = moveClass === 'miss' ? '#f1f2f2' : '#fff';
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 19">${BREAK}<path opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"/>${BREAK}<path fill="${CLASS_COLORS[moveClass]}" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"/>${BREAK}<g opacity="${shadowOpacity}" transform="translate(0 .5)">${glyphs}</g>${BREAK}<g fill="${glyphFill}">${glyphs}</g></svg>`;
}

const svgCache = new Map<MoveClass, SafeHtml>();

/** The icon as inline SVG markup. */
export function classSvg(moveClass: MoveClass): SafeHtml {
  let svg = svgCache.get(moveClass);
  if (!svg) {
    svg = buildSvg(moveClass);
    svgCache.set(moveClass, svg);
  }
  return svg;
}

/** The icon as a CSS image (`--cdc-class-icon` on the move list's moves, the opening's name). */
export const classImage = (moveClass: MoveClass): string =>
  `url("data:image/svg+xml,${encodeURIComponent(classSvg(moveClass).value)}")`;

/** The icon in its wrapper, as the panel shows it. */
export const classIcon = (moveClass: MoveClass): SafeHtml =>
  html`<span class="cdc-cls-icon">${classSvg(moveClass)}</span>`;
