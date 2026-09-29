import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setReadyState } from '#shared/testing/ready-state.ts';
import { flipLabel } from './flip-label.ts';

const label = (): string | undefined => document.documentElement.dataset.cdcFlipLabel;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  setReadyState('complete');
  Reflect.deleteProperty(window, 'i18n');
  delete document.documentElement.dataset.cdcFlipLabel;
  document.body.replaceChildren();
});

describe('flipLabel', () => {
  it('copies Lichess’s label onto <html>', () => {
    Object.assign(window, { i18n: { site: { flipBoard: 'Tourner l’échiquier' } } });
    flipLabel.start();
    expect(label()).toBe('Tourner l’échiquier');
  });

  it('waits for the translations while the page parses', () => {
    setReadyState('loading');
    flipLabel.start();
    vi.advanceTimersByTime(500);
    expect(label()).toBeUndefined();
    Object.assign(window, { i18n: { site: { flipBoard: 'Flip board' } } });
    vi.advanceTimersByTime(250);
    expect(label()).toBe('Flip board');
  });

  it('keeps waiting on a game page, for 30 seconds', () => {
    document.body.innerHTML = '<main class="round"></main>';
    flipLabel.start();
    vi.advanceTimersByTime(30_000);
    Object.assign(window, { i18n: { site: { flipBoard: 'Flip board' } } });
    vi.advanceTimersByTime(1000);
    expect(label()).toBeUndefined();
  });

  it('gives up at once on a parsed page with no game', () => {
    flipLabel.start();
    Object.assign(window, { i18n: { site: { flipBoard: 'Flip board' } } });
    vi.advanceTimersByTime(1000);
    expect(label()).toBeUndefined();
  });
});
