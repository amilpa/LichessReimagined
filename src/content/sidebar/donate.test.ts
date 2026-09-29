import { afterEach, describe, expect, it } from 'vitest';
import { addDonateItem } from './donate.ts';
// The sidebar as the original left it.
import legacy from './fixtures/legacy-donate.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the Donate item', () => {
  it.each(legacy)('is added as the original added it: $name', ({ html, after }) => {
    document.body.innerHTML = html;
    addDonateItem();
    addDonateItem();
    expect(document.body.innerHTML.replaceAll(location.origin, '<origin>')).toBe(after);
  });
});
