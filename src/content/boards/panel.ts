import { createElement, queryAll, setData, setStyleProperty } from '#shared/dom.ts';
import { LICHESS } from './catalog.ts';
import type { Picker } from './pickers.ts';

// The Extension / Lichess tabs added to the user menu's Board and Piece set
// panels (styles/sidebar/dasher-pickers.css).

export type View = 'cdc' | typeof LICHESS;

const TABS: readonly (readonly [View, string])[] = [
  ['cdc', 'Extension'],
  [LICHESS, 'Lichess'],
];

export const viewOf = (pick: string): View => (pick === LICHESS ? LICHESS : 'cdc');

/**
 * Rings the current pick, in its own tab only: while one of our boards is on,
 * Lichess's current board isn't the one the page shows.
 */
export function markPanel(panel: HTMLElement, picker: Picker): void {
  const current = picker.current();
  setData(panel, 'cdcSrcOn', viewOf(current));
  for (const item of queryAll(panel, '.cdc-src-item', HTMLElement))
    item.classList.toggle('active', item.dataset.cdcChoice === current);
}

function showView(panel: HTMLElement, view: View): void {
  setData(panel, 'cdcView', view);
  for (const tab of queryAll(panel, '.cdc-src-tabs button', HTMLElement))
    tab.classList.toggle('active', tab.dataset.cdcTab === view);
}

function tabBar(onTab: (view: View) => void): HTMLElement {
  const bar = createElement('div', { className: 'cdc-src-tabs' });
  for (const [view, label] of TABS) {
    const tab = createElement('button', {
      text: label,
      attrs: { type: 'button', class: '', 'data-cdc-tab': view },
    });
    tab.addEventListener('click', () => onTab(view));
    bar.append(tab);
  }
  return bar;
}

function choiceList(picker: Picker, onPick: (id: string) => void): HTMLElement {
  const list = createElement('div', { className: 'cdc-src-list' });
  for (const { id, name } of picker.choices) {
    const item = createElement('button', {
      attrs: { type: 'button', class: 'cdc-src-item', 'data-cdc-choice': id },
    });
    const thumb = createElement('span', { className: 'cdc-src-thumb' });
    setStyleProperty(thumb, 'background-image', `url('${picker.thumbnail(id)}')`);
    item.append(thumb, createElement('span', { className: 'cdc-src-name', text: name }));
    item.addEventListener('click', () => onPick(id));
    list.append(item);
  }
  return list;
}

export interface DressOptions {
  readonly view: View;
  readonly onTab: (view: View) => void;
  readonly onPick: (id: string) => void;
}

/**
 * Puts the tabs after the panel's title and our choices after them. Snabbdom
 * leaves alone the nodes it didn't create, so ours can sit among Lichess's.
 */
export function dressPanel(panel: HTMLElement, picker: Picker, options: DressOptions): void {
  const tabs = tabBar(view => {
    options.onTab(view);
    showView(panel, view);
  });
  panel.querySelector(':scope > .head')?.after(tabs, choiceList(picker, options.onPick));
  markPanel(panel, picker);
  showView(panel, options.view);
}
