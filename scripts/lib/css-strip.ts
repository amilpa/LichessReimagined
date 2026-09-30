// A release's stylesheet without what only its readers need: comments, blank
// lines and indentation. Strings are copied as they are, so a `/*` or a line
// continuation inside one survives. No rule is merged or rewritten: the
// result behaves exactly as the source.

/** Where the string opening at `start` ends, past its closing quote. */
function stringEnd(css: string, start: number): number {
  const quote = css[start];
  for (let i = start + 1; i < css.length; i++) {
    if (css[i] === '\\') i++;
    else if (css[i] === quote) return i + 1;
  }
  return css.length;
}

function commentEnd(css: string, start: number): number {
  const close = css.indexOf('*/', start + 2);
  return close === -1 ? css.length : close + 2;
}

const isBlank = (char: string | undefined): boolean =>
  char === ' ' || char === '\t' || char === '\n' || char === '\r';

/** Where the next piece of `css` starts: past a string or a comment, else one character on. */
function pieceEnd(css: string, start: number): number {
  const char = css[start];
  if (char === '"' || char === "'") return stringEnd(css, start);
  if (char === '/' && css[start + 1] === '*') return commentEnd(css, start);
  return start + 1;
}

export function stripCss(css: string): string {
  const lines: string[] = [];
  let line = '';
  let i = 0;
  while (i < css.length) {
    const end = pieceEnd(css, i);
    const piece = css.slice(i, end);
    i = end;
    if (piece === '\n') {
      if (line.trim() !== '') lines.push(line.trim());
      line = '';
      // The next line's indentation, and any blank lines.
      while (isBlank(css[i])) i++;
    } else if (!piece.startsWith('/*')) line += piece;
  }
  if (line.trim() !== '') lines.push(line.trim());
  return `${lines.join('\n')}\n`;
}
