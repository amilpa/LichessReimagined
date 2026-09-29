import { expect, type Locator, type Page } from '@playwright/test';

// The settings menu (Lichess's "dasher", the cog at the bottom of the sidebar)
// and its Board and Piece set panels, to which the extension adds its tabs.

export type PickerKind = 'board' | 'piece';

// By name, in English: a signed-out visitor's menu has no other hook for them.
const ITEM_NAMES: Readonly<Record<PickerKind, RegExp>> = {
  board: /^Board$/,
  piece: /^Piece set$/,
};

/** Opens the menu on the board's or the pieces' panel, and returns that panel. */
export async function openPicker(page: Page, kind: PickerKind): Promise<Locator> {
  await page.locator('#top .dasher > .toggle').click();
  await page.locator('#dasher_app .subs > button.sub', { hasText: ITEM_NAMES[kind] }).click();
  const panel = page.locator(`#dasher_app .sub.${kind}`);
  await expect(panel).toBeVisible();
  return panel;
}

export const pickerTab = (panel: Locator, view: 'cdc' | 'lichess'): Locator =>
  panel.locator(`.cdc-src-tabs > button[data-cdc-tab="${view}"]`);

/** One of the extension's choices in the panel's Extension tab. */
export const ourChoice = (panel: Locator, id: string): Locator =>
  panel.locator(`.cdc-src-list .cdc-src-item[data-cdc-choice="${id}"]`);

/** Lichess's own choices, in its tab. */
export const lichessChoices = (panel: Locator): Locator => panel.locator('.list > button');
