import { afterEach, describe, expect, it, vi } from 'vitest';
import { roundsProgress, syncFocus, syncMedals, syncRounds } from './swiss.ts';
// Round bars and medals as the original set them, before and after a change.
import legacy from './fixtures/legacy-swiss.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('swiss rounds and medals', () => {
  it('marks them as the original did, and follows a change', () => {
    document.body.innerHTML = legacy.html;
    syncRounds();
    syncMedals();
    expect(document.body.innerHTML).toBe(legacy.first);
    const round = document.querySelector('.swiss__meta__round');
    if (round) round.textContent = '5/9 rounds';
    const second = document.querySelectorAll('td.rank')[1];
    if (second) second.textContent = '7';
    syncRounds();
    syncMedals();
    expect(document.body.innerHTML).toBe(legacy.second);
  });

  it('reads a round count', () => {
    expect(roundsProgress('3 / 4')).toBe('75%');
    expect(roundsProgress('3/0')).toBeNull();
    expect(roundsProgress('')).toBeNull();
  });
});

describe('swiss focus', () => {
  const html = '<main class="swiss"><div class="swiss__main"></div></main>';

  it('gives the middle column the focus once, from 1260px', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.body.innerHTML = html;
    syncFocus();
    const column = document.querySelector('.swiss__main');
    expect(column?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(column);
  });

  it('keeps the focus where it is, and does nothing on narrow windows', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    document.body.innerHTML = html;
    syncFocus();
    expect(document.querySelector('.swiss__main')?.hasAttribute('tabindex')).toBe(false);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.body.insertAdjacentHTML('afterbegin', '<input id="search">');
    document.getElementById('search')?.focus();
    syncFocus();
    expect(document.activeElement?.id).toBe('search');
    expect(document.querySelector('.swiss__main')?.getAttribute('tabindex')).toBe('-1');
  });
});
