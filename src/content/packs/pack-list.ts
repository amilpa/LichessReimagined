import { createElement, setStyleProperty } from '#shared/dom.ts';
import { downloadPack } from './download.ts';
import type { Library } from './library.ts';
import { hasPart, type Pack, type PartKind } from './pack.ts';

// The Imported tab of a panel: the packs that have its part, each with a
// button to remove it, and the form that imports one from a GitHub link. A
// private repository's token is used for that import and never kept: the
// page's storage is Lichess's to read.

export const HELP_URL = 'https://github.com/theophile-wallez/LichessDotCom/blob/main/docs/packs.md';

/** What the last import said, shown again in a panel Lichess draws anew. */
interface ImportState {
  busy: boolean;
  message: string;
  failed: boolean;
}

const importState: ImportState = { busy: false, message: '', failed: false };

function thumbnail(kind: PartKind, pack: Pack): string | null {
  if (kind === 'board') return pack.board?.image ?? null;
  if (kind === 'piece') return pack.pieces?.wN ?? null;
  return null;
}

function packEntry(kind: PartKind, pack: Pack, library: Library): HTMLElement {
  const entry = createElement('div', { className: 'cdc-src-entry' });
  const item = createElement('button', {
    attrs: { type: 'button', class: 'cdc-src-item', 'data-cdc-choice': pack.id, title: pack.link },
  });
  const thumb = createElement('span', { className: 'cdc-src-thumb' });
  const image = thumbnail(kind, pack);
  if (image !== null) setStyleProperty(thumb, 'background-image', `url("${image}")`);
  item.append(thumb, createElement('span', { className: 'cdc-src-name', text: pack.name }));
  item.addEventListener('click', () => library.choose(kind, pack.id));
  const remove = createElement('button', {
    text: '×',
    attrs: {
      type: 'button',
      class: 'cdc-src-remove',
      title: 'Remove this pack',
      'aria-label': 'Remove',
    },
  });
  remove.addEventListener('click', () => void library.remove(pack.id));
  entry.append(item, remove);
  return entry;
}

function statusLine(): HTMLElement {
  const status = createElement('p', {
    className: 'cdc-src-status',
    text: importState.message,
    attrs: { 'aria-live': 'polite' },
  });
  status.classList.toggle('cdc-src-status--failed', importState.failed);
  return status;
}

function setStatus(message: string, failed: boolean): void {
  importState.message = message;
  importState.failed = failed;
  for (const status of document.querySelectorAll('#dasher_app .cdc-src-status')) {
    status.textContent = message;
    status.classList.toggle('cdc-src-status--failed', failed);
  }
}

async function importPack(link: string, token: string, library: Library): Promise<void> {
  importState.busy = true;
  setStatus('Importing…', false);
  try {
    const download = await downloadPack(link, token);
    if ('error' in download) {
      setStatus(download.error, true);
      return;
    }
    await library.add(download.pack);
    setStatus(`Imported “${download.pack.name}”.`, false);
  } catch (error) {
    console.error('[LichessDotCom] pack import failed', error);
    setStatus('The pack could not be imported.', true);
  } finally {
    importState.busy = false;
  }
}

// The link stays in its field after a failure, to be fixed.
async function importInto(link: HTMLInputElement, token: string, library: Library): Promise<void> {
  await importPack(link.value, token, library);
  if (!importState.failed) link.value = '';
}

function tokenField(): { readonly field: HTMLElement; readonly input: HTMLInputElement } {
  const field = createElement('details', { className: 'cdc-src-private' });
  const input = createElement('input', {
    attrs: {
      type: 'password',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'GitHub token',
      'aria-label': 'GitHub token',
    },
  });
  field.append(
    createElement('summary', { text: 'Private repository?' }),
    input,
    createElement('p', {
      className: 'cdc-src-note',
      text: 'A token that can read the repository’s contents, used for this import only and never kept.',
    }),
  );
  return { field, input };
}

function importForm(library: Library): HTMLElement {
  const form = createElement('form', { className: 'cdc-src-import' });
  const row = createElement('div', { className: 'cdc-src-import__row' });
  const link = createElement('input', {
    attrs: {
      type: 'url',
      required: '',
      spellcheck: 'false',
      placeholder: 'Link to a pack on GitHub',
      'aria-label': 'Link to a pack on GitHub',
    },
  });
  row.append(link, createElement('button', { text: 'Import', attrs: { type: 'submit' } }));
  const token = tokenField();
  form.append(row, token.field);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (importState.busy) return;
    const secret = token.input.value;
    token.input.value = '';
    void importInto(link, secret, library);
  });
  return form;
}

/** The Imported tab's content for a panel's part. */
export function packSection(kind: PartKind, library: Library): HTMLElement {
  const section = createElement('div', { className: 'cdc-src-packs' });
  const packs = library.packs().filter(pack => hasPart(pack, kind));
  const list = createElement('div', { className: 'cdc-src-list' });
  list.append(...packs.map(pack => packEntry(kind, pack, library)));
  const empty = createElement('p', { className: 'cdc-src-empty', text: 'No pack imported yet.' });
  const help = createElement('a', {
    className: 'cdc-src-help',
    text: 'How to make a pack',
    attrs: { href: HELP_URL, target: '_blank', rel: 'noopener' },
  });
  section.append(packs.length > 0 ? list : empty, importForm(library), statusLine(), help);
  return section;
}
