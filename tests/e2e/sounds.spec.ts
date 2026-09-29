import { SOUND_NAMES } from '#shared/sounds.ts';
import { expect, test } from './fixtures.ts';
import { openLichess, readPageGlobal } from './support/lichess.ts';
import { OUR_SOUND_PREFIX, ourSounds } from './support/sounds.ts';

// Chess.com's sounds in Lichess's own sound player. Lichess's CSP lets audio
// load from blob: URLs only, so the content script reads the bundled files
// and the page script hands them over as blobs.

test('our sounds are in Lichess’s sound player, as blobs of audio', async ({ page }) => {
  await openLichess(page, '/tv');
  await expect.poll(async () => (await ourSounds(page)).size).toBe(SOUND_NAMES.length);
  const sounds = await ourSounds(page);
  expect([...sounds.keys()].toSorted()).toEqual(
    SOUND_NAMES.map(name => `${OUR_SOUND_PREFIX}${name}`).toSorted(),
  );
  for (const url of sounds.values()) expect(url).toMatch(/^blob:https:\/\/lichess\.org\//);
  expect(await readPageGlobal(page, ['site', 'sound', 'cdcHooked'])).toBe(true);

  // The bytes made it across: each blob is a whole MP3.
  const blobs = await page.evaluate(
    urls =>
      Promise.all(
        urls.map(async url => {
          const blob = await (await fetch(url)).blob();
          return { type: blob.type, size: blob.size };
        }),
      ),
    [...sounds.values()],
  );
  for (const blob of blobs) {
    expect(blob.type).toBe('audio/mpeg');
    expect(blob.size).toBeGreaterThan(1000);
  }
});
