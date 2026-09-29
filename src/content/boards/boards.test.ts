import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackListeners } from '#shared/testing/listeners.ts';
import { setReadyState } from '#shared/testing/ready-state.ts';
import { flush } from '#shared/testing/timers.ts';
import { PIECE_CODES } from './catalog.ts';
import { boards } from './index.ts';
// What the original script did with the same storage and the same clicks.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const PROPERTIES = [
  '--cdc-board-img',
  '--cdc-sq-light',
  '--cdc-sq-dark',
  ...PIECE_CODES.map(code => `--cdc-piece-${code}`),
];

const root = document.documentElement;

// The attributes that got the `cdc` prefix in the port, mapped back to the
// original's names, which the recordings use.
const RENAMED: readonly (readonly [port: string, original: string])[] = [
  ['data-cdc-tab=', 'data-view='],
  ['data-cdc-choice=', 'data-id='],
];
const withLegacyNames = (markup: string): string =>
  RENAMED.reduce((text, [port, original]) => text.replaceAll(port, original), markup);

function rootState(): {
  dataset: Record<string, string | undefined>;
  properties: Record<string, string>;
} {
  const properties: Record<string, string> = {};
  for (const name of PROPERTIES) {
    const value = root.style.getPropertyValue(name);
    if (value !== '') properties[name] = value;
  }
  return { dataset: Object.fromEntries(Object.entries(root.dataset)), properties };
}

const dataOf = (element: Element, key: string): string | null =>
  element instanceof HTMLElement ? (element.dataset[key] ?? null) : null;

function panelSummary(app: Element): unknown[] {
  return [...app.querySelectorAll('.sub')].map(panel => ({
    classes: panel.className,
    srcOn: dataOf(panel, 'cdcSrcOn'),
    view: dataOf(panel, 'cdcView'),
    tabs: panel.querySelectorAll(':scope > .cdc-src-tabs').length,
    lists: panel.querySelectorAll(':scope > .cdc-src-list').length,
    activeTabs: [...panel.querySelectorAll('.cdc-src-tabs button.active')].map(tab =>
      dataOf(tab, 'cdcTab'),
    ),
    activeItems: [...panel.querySelectorAll('.cdc-src-item.active')].map(item =>
      dataOf(item, 'cdcChoice'),
    ),
  }));
}

const boardPanel = (dimension = 'd2'): string =>
  `<div class="sub board ${dimension}"><button class="head text" data-icon="x">Board</button>` +
  `<div class="selector"><button class="active">2D</button><button>3D</button></div>` +
  `<div class="list"><button title="brown" class="active"><span class="color-brown"></span></button><button title="blue"><span class="color-blue"></span></button></div></div>`;
const piecePanel = (): string =>
  `<div class="sub piece d2"><button class="head text" data-icon="x">Piece set</button>` +
  `<div class="list"><button title="cburnett" class="active"><piece class="white knight cburnett"></piece></button><button title="merida"><piece class="white knight merida"></piece></button></div></div>`;
const headless = (): string =>
  `<div class="sub board d2"><div class="list"><button title="brown"></button></div></div>`;
const SHELL =
  '<header id="top"><div class="dasher"><button id="user_tag">u</button><div id="dasher_app" class="dropdown"></div></div></header>';

function app(): HTMLElement {
  const element = document.getElementById('dasher_app');
  if (!element) throw new Error('no menu');
  return element;
}

function click(selector: string): void {
  app()
    .querySelector(selector)
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function draw(markup: string): Promise<void> {
  app().innerHTML = markup;
  await flush();
}

// Every start adds a click listener to the document: remove them between tests.
let removeListeners = (): void => {};
beforeEach(() => {
  removeListeners = trackListeners(document);
  vi.stubGlobal('chrome', {
    runtime: { getURL: (path: string) => `chrome-extension://abc/${path}` },
  });
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
  localStorage.clear();
  document.body.innerHTML = '';
  setReadyState('complete');
});
afterEach(() => removeListeners());

function start(stored: Readonly<Record<string, string>>): void {
  for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value);
  boards.start();
}

describe('the pick on <html>', () => {
  it.each(legacy.roots)('matches the original for $stored', ({ stored, dataset, properties }) => {
    start(stored);
    expect(rootState()).toEqual({ dataset, properties });
  });
});

describe('the user menu', () => {
  it('adds the tabs and lists, and follows the clicks, as the original did', async () => {
    document.body.innerHTML = SHELL;
    start({ 'cdc-board': 'lichess', 'cdc-pieces': 'glass' });
    const steps: unknown[] = [];
    const markup: Record<string, string> = {};
    const record = (step: string): void => {
      steps.push({
        step,
        panels: panelSummary(app()),
        ...rootState(),
        storage: {
          board: localStorage.getItem('cdc-board'),
          pieces: localStorage.getItem('cdc-pieces'),
        },
      });
    };

    await draw(boardPanel());
    markup['board'] = withLegacyNames(app().innerHTML);
    record('board panel opens');
    click('.cdc-src-item[data-cdc-choice="walnut"] .cdc-src-name');
    record('walnut picked');
    click('.cdc-src-tabs button[data-cdc-tab="lichess"]');
    record('lichess tab');
    await draw(boardPanel('d3'));
    record('switched to 3D');
    click('.list > button[title="blue"] span');
    record('a 3D board clicked');
    await draw(boardPanel('d2'));
    record('back to 2D');
    click('.list > button[title="blue"] span');
    record('lichess board picked');
    click('.list > button[title="brown"]');
    record('lichess board picked again');
    click('.cdc-src-tabs button[data-cdc-tab="cdc"]');
    record('extension tab');
    click('.selector > button');
    record('selector clicked');
    click('.cdc-src-item[data-cdc-choice="green"]');
    record('green picked');
    await draw(piecePanel());
    markup['piece'] = withLegacyNames(app().innerHTML);
    record('piece panel opens');
    click('.cdc-src-item[data-cdc-choice="neo"]');
    record('neo picked');
    click('.list > button[title="merida"]');
    record('lichess pieces picked');
    await draw('');
    record('menu closed');
    await draw(piecePanel());
    record('piece panel opens again');
    await draw(headless());
    record('a panel without a head');
    await draw(boardPanel() + piecePanel());
    record('both panels');
    click('.sub.piece .cdc-src-item[data-cdc-choice="8qetl"]');
    record('8qetl picked');
    // Snabbdom replaces the menu's own node.
    const replacement = document.createElement('div');
    replacement.id = 'dasher_app';
    replacement.innerHTML = boardPanel();
    app().replaceWith(replacement);
    await flush();
    record('menu node replaced');

    expect(markup).toEqual(legacy.markup);
    expect(steps).toEqual(legacy.steps);
  });

  it('prefixes the data attributes it adds with cdc', async () => {
    document.body.innerHTML = SHELL;
    start({});
    await draw(boardPanel());
    const panel = app().querySelector('.sub');
    if (!panel) throw new Error('no panel');
    const ours = [...panel.querySelectorAll('.cdc-src-tabs, .cdc-src-list, .cdc-src-list *')];
    const unprefixed = [panel, ...ours]
      .flatMap(element => element.getAttributeNames())
      .filter(name => name.startsWith('data-') && !name.startsWith('data-cdc-'));
    expect(unprefixed).toEqual([]);
    const tabs = [...panel.querySelectorAll('.cdc-src-tabs > button')];
    expect(tabs.map(tab => tab.getAttributeNames())).toEqual([
      ['type', 'class', 'data-cdc-tab'],
      ['type', 'class', 'data-cdc-tab'],
    ]);
  });

  it('looks for the menu once the page is parsed', async () => {
    setReadyState('loading');
    start({});
    document.body.innerHTML = SHELL;
    app().innerHTML = boardPanel();
    await flush();
    const beforeReady = panelSummary(app());
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect({ beforeReady, afterReady: panelSummary(app()) }).toEqual(legacy.parsing);
  });

  it('does nothing without a menu', async () => {
    document.body.innerHTML = '<div class="sub board d2"><div class="head"></div></div>';
    start({});
    await flush();
    expect(document.querySelector('.cdc-src-tabs')).toBeNull();
  });
});
