import { queryAll } from '#shared/dom.ts';

// A rating's stats page doesn't use #page-init-data: it passes the module its
// data in the call itself, as a JS object around a JSON array, in a script
// that stays in the page:
// loadEsm('chart.ratingHistory',{init:{data:[…],singlePerfName:'Blitz'}})

export interface InlineInit {
  readonly data: unknown;
  readonly singlePerfName: string | undefined;
}

const MODULE = "'chart.ratingHistory'";
const PERF_NAME = /singlePerfName:\s*'((?:[^'\\]|\\.)*)'/;

// Where the array opened at `open` closes, or -1. A bracket inside a string
// doesn't count, and JSON strings are always double-quoted.
function closingBracket(text: string, open: number): number {
  let depth = 0;
  let inString = false;
  for (let k = open; k < text.length; k++) {
    const char = text[k];
    if (inString) {
      if (char === '\\') k++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/** The module's data, if this script calls it with a readable one. */
export function extractInlineInit(text: string): InlineInit | null {
  const call = text.indexOf(MODULE);
  const key = call < 0 ? -1 : text.indexOf('data:', call);
  const open = key < 0 ? -1 : text.indexOf('[', key);
  if (open < 0) return null;
  const close = closingBracket(text, open);
  let data: unknown;
  try {
    data = JSON.parse(text.slice(open, close + 1));
  } catch {
    return null;
  }
  const name = PERF_NAME.exec(text.slice(close))?.[1];
  return { data, singlePerfName: name?.replaceAll(/\\(.)/g, '$1') };
}

export function readInlineInit(root: ParentNode): InlineInit | null {
  for (const script of queryAll(root, 'script:not([src])', HTMLScriptElement)) {
    const init = extractInlineInit(script.textContent);
    if (init) return init;
  }
  return null;
}
