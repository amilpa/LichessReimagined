import { afterEach, describe, expect, it } from 'vitest';
import { coachTitle, syncCoachTitles } from './coach-titles.ts';
// The coach cards as the original left them.
import legacy from './fixtures/legacy-coach-titles.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('coach titles', () => {
  it('badges the titles as the original did', () => {
    document.body.innerHTML = `<main class="coach-list">${legacy.html}</main>`;
    syncCoachTitles();
    syncCoachTitles();
    expect(document.querySelector('main')?.innerHTML).toBe(legacy.after);
  });

  it('reads a title off the picture’s alt', () => {
    expect(coachTitle('WFM Jane Doe')).toBe('WFM');
    expect(coachTitle('Jane Doe')).toBe('');
    expect(coachTitle(undefined)).toBe('');
  });
});
