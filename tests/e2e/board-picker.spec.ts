import type { Locator, Page } from '@playwright/test';
import catalog from '#content/boards/catalog.json' with { type: 'json' };
import { expect, test } from './fixtures.ts';
import {
  lichessChoices,
  openPicker,
  ourChoice,
  pickerTab,
  type PickerKind,
} from './support/dasher.ts';
import { computedStyle, inlineRootVariable, openLichess, storedValue } from './support/lichess.ts';

// The board and the pieces, picked in the settings menu: one of ours (bundled
// in the extension), or Lichess's own, which hands the choice back to it.

interface Picker {
  readonly kind: PickerKind;
  /** The attribute on <html> naming the pick. */
  readonly attribute: string;
  /** Where the pick is kept. Users' picks live there: it must not change. */
  readonly storageKey: string;
  /** The variable on <html> holding the picked image. */
  readonly variable: string;
  /** How many the Extension tab offers. */
  readonly choices: number;
  readonly defaultId: string;
  readonly pickedId: string;
  readonly pickedImage: string;
  /** The image the page draws the pick with. */
  readonly drawn: (page: Page) => Promise<string>;
}

const boardImage = (page: Page): Promise<string> =>
  computedStyle(page.locator('main .main-board cg-board'), 'background-image', '::before');

const knightImage = (page: Page): Promise<string> =>
  computedStyle(page.locator('main .main-board piece.knight.white').first(), 'background-image');

const PICKERS: readonly Picker[] = [
  {
    kind: 'board',
    attribute: 'data-cdc-board',
    storageKey: 'cdc-board',
    variable: '--cdc-board-img',
    choices: catalog.boards.length,
    defaultId: 'green',
    pickedId: 'walnut',
    pickedImage: 'img/boards/walnut.webp',
    drawn: boardImage,
  },
  {
    kind: 'piece',
    attribute: 'data-cdc-pieces',
    storageKey: 'cdc-pieces',
    variable: '--cdc-piece-wn',
    choices: catalog.pieceSets.length,
    defaultId: 'neo',
    pickedId: 'glass',
    pickedImage: 'img/pieces/glass/wn.webp',
    drawn: knightImage,
  },
];

async function expectOurs(page: Page, picker: Picker): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute(picker.attribute, picker.pickedId);
  expect(await inlineRootVariable(page, picker.variable)).toContain(picker.pickedImage);
  await expect.poll(() => picker.drawn(page)).toContain(picker.pickedImage);
}

async function expectExtensionTab(panel: Locator, picker: Picker): Promise<void> {
  await expect(panel.locator('.cdc-src-tabs > button')).toHaveCount(2);
  await expect(pickerTab(panel, 'cdc')).toHaveClass(/\bactive\b/);
  await expect(panel.locator('.cdc-src-item')).toHaveCount(picker.choices);
  await expect(panel.locator('.cdc-src-item.active')).toHaveAttribute(
    'data-cdc-choice',
    picker.defaultId,
  );
}

for (const picker of PICKERS) {
  test(`the ${picker.kind} picker offers ours, keeps the pick, and hands back to Lichess`, async ({
    page,
  }) => {
    await openLichess(page, '/analysis');
    const panel = await openPicker(page, picker.kind);
    await expectExtensionTab(panel, picker);

    await ourChoice(panel, picker.pickedId).click();
    await expect(ourChoice(panel, picker.pickedId)).toHaveClass(/\bactive\b/);
    await expectOurs(page, picker);
    expect(await storedValue(page, picker.storageKey)).toBe(picker.pickedId);

    await page.reload({ waitUntil: 'load' });
    await expectOurs(page, picker);

    const reopened = await openPicker(page, picker.kind);
    await pickerTab(reopened, 'lichess').click();
    await expect(reopened).toHaveAttribute('data-cdc-view', 'lichess');
    // Any of Lichess's own hands the choice back, even the one it already had.
    await lichessChoices(reopened).nth(2).click();
    await expect(page.locator('html')).toHaveAttribute(picker.attribute, 'lichess');
    expect(await inlineRootVariable(page, picker.variable)).toBe('');
    // Lichess's own image, from its own server.
    await expect.poll(() => picker.drawn(page)).toMatch(/^url\("https:\/\//);
    expect(await storedValue(page, picker.storageKey)).toBe('lichess');
  });
}
