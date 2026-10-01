import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { watchDasher } from './dasher.ts';
import { fakeGithub } from './fixtures/github.ts';
import { fakePack } from './fixtures/packs.ts';
import { createLibrary, LICHESS, type Library } from './library.ts';
import type { Pack } from './pack.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const CLICKS = fakePack('ann/packs/main/clicks/', ['sound']);

// Lichess's user menu, with one panel open, as snabbdom draws it.
const PANELS = {
  board:
    '<div class="sub board d2"><button class="head">Board</button>' +
    '<div class="list"><button class="active"><span></span></button><button><span></span></button></div></div>',
  piece:
    '<div class="sub piece d2"><button class="head">Piece set</button>' +
    '<div class="list"><button class="no-square active"><piece></piece></button></div></div>',
  sound:
    '<div class="sub sound standard"><button class="head">Sound</button><div class="content">' +
    '<input type="range"><div class="selector"><button class="active">Standard</button>' +
    '<button>Piano</button></div></div></div>',
};

let stopListeners: () => void;

function openPanel(kind: keyof typeof PANELS): HTMLElement {
  const app = document.getElementById('dasher_app');
  if (app) app.innerHTML = PANELS[kind];
  const panel = queryOne(document, `#dasher_app .sub.${kind}`, HTMLElement);
  if (!panel) throw new Error('no panel');
  return panel;
}

function start(packs: readonly Pack[]): Library {
  const library = createLibrary({
    packs,
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  watchDasher(library);
  return library;
}

const tab = (panel: HTMLElement, view: string): HTMLElement | null =>
  queryOne(panel, `.cdc-src-tabs button[data-cdc-tab="${view}"]`, HTMLElement);
const names = (panel: HTMLElement): (string | null)[] =>
  queryAll(panel, '.cdc-src-name', HTMLElement).map(name => name.textContent);
const status = (panel: HTMLElement): string | null | undefined =>
  panel.querySelector('.cdc-src-status')?.textContent;

function submit(panel: HTMLElement, link: string, token = ''): void {
  const [input, secret] = queryAll(panel, '.cdc-src-import input', HTMLInputElement);
  if (!input || !secret) throw new Error('no form');
  input.value = link;
  secret.value = token;
  queryOne(panel, '.cdc-src-import', HTMLFormElement)?.requestSubmit();
}

beforeEach(() => {
  stopListeners = trackListeners(document);
  document.body.innerHTML =
    '<div id="top"><div class="dasher"><div id="dasher_app"></div></div></div>';
});

afterEach(() => {
  stopListeners();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('the user menu’s panels', () => {
  it('get a Lichess and an Imported tab, open on what the page shows', async () => {
    localStorage.setItem('cdc-pieces', WOOD.id);
    start([WOOD, CLICKS]);
    const board = openPanel('board');
    await flush();
    expect(
      queryAll(board, '.cdc-src-tabs button', HTMLElement).map(button => button.textContent),
    ).toEqual(['Lichess', 'Imported']);
    expect(board.dataset.cdcView).toBe(LICHESS);
    // Only the packs with a board.
    expect(names(board)).toEqual(['Pack ann/packs/main/wood/']);
    const piece = openPanel('piece');
    await flush();
    expect(piece.dataset.cdcView).toBe('packs');
    expect(piece.dataset.cdcSrcOn).toBe('packs');
    expect(queryOne(piece, '.cdc-src-item.active', HTMLElement)?.dataset.cdcChoice).toBe(WOOD.id);
  });

  it('pick a pack, and hand the part back to Lichess from its own list', async () => {
    const library = start([WOOD]);
    const panel = openPanel('board');
    await flush();
    tab(panel, 'packs')?.click();
    expect(panel.dataset.cdcView).toBe('packs');
    queryOne(panel, `.cdc-src-item[data-cdc-choice="${WOOD.id}"]`, HTMLElement)?.click();
    expect(library.current('board')).toBe(WOOD.id);
    expect(panel.dataset.cdcSrcOn).toBe('packs');
    queryOne(panel, '.list > button', HTMLElement)?.click();
    expect(library.current('board')).toBe(LICHESS);
    expect(panel.dataset.cdcSrcOn).toBe(LICHESS);
  });

  it('list the sound packs beside the volume, and Lichess’s sets hand the sounds back', async () => {
    const library = start([WOOD, CLICKS]);
    const panel = openPanel('sound');
    await flush();
    expect(panel.querySelector('.content > .cdc-src-packs')).not.toBeNull();
    expect(names(panel)).toEqual(['Pack ann/packs/main/wood/', 'Pack ann/packs/main/clicks/']);
    library.choose('sound', CLICKS.id);
    queryAll(panel, '.selector > button', HTMLElement)[1]?.click();
    expect(library.current('sound')).toBe(LICHESS);
  });

  it('remove a pack from every list', async () => {
    const library = start([WOOD, CLICKS]);
    const panel = openPanel('sound');
    await flush();
    queryOne(panel, '.cdc-src-remove', HTMLElement)?.click();
    await flush();
    expect(library.packs()).toEqual([CLICKS]);
    expect(names(queryOne(document, '#dasher_app .sub.sound', HTMLElement) ?? panel)).toEqual([
      'Pack ann/packs/main/clicks/',
    ]);
  });
});

describe('importing a pack', () => {
  const files = new Map([
    ['pack.json', new TextEncoder().encode('{"name":"Clicks","sounds":{"capture":"c.mp3"}}')],
    ['c.mp3', new Uint8Array([0x49, 0x44, 0x33, 4])],
  ]);

  it('downloads it, lists it, picks it, and says so', async () => {
    fakeGithub({ repo: 'ann/packs', files });
    const library = start([]);
    const panel = openPanel('sound');
    await flush();
    expect(panel.querySelector('.cdc-src-empty')?.textContent).toBe('No pack imported yet.');
    submit(panel, 'https://github.com/ann/packs');
    expect(status(panel)).toBe('Importing…');
    await vi.waitFor(() => expect(library.packs()).toHaveLength(1));
    await flush();
    const redrawn = queryOne(document, '#dasher_app .sub.sound', HTMLElement) ?? panel;
    expect(names(redrawn)).toEqual(['Clicks']);
    expect(library.current('sound')).toBe('ann/packs/HEAD/');
    expect(status(redrawn)).toBe('Imported “Clicks”.');
    expect(queryOne(redrawn, '.cdc-src-import input', HTMLInputElement)?.value).toBe('');
  });

  it('says what went wrong, keeping the link to fix it', async () => {
    fakeGithub({ repo: 'ann/packs', files, token: 'secret' });
    start([]);
    const panel = openPanel('board');
    await flush();
    submit(panel, 'https://github.com/ann/packs', 'nope');
    const [link, token] = queryAll(panel, '.cdc-src-import input', HTMLInputElement);
    // Never left in the page, which Lichess's scripts can read.
    expect(token?.value).toBe('');
    await vi.waitFor(() => expect(status(panel)).toBe('GitHub turned the token down.'));
    expect(panel.querySelector('.cdc-src-status--failed')).not.toBeNull();
    expect(link?.value).toBe('https://github.com/ann/packs');
  });
});
