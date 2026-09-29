import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreReadyState, setReadyState } from '#shared/testing/ready-state.ts';
import { markComputerPlayers, readComputerPlayers } from './ai-players.ts';
// What the original script set on <html> for each page's init data.
import legacy from './fixtures/legacy-ai-players.json' with { type: 'json' };

const root = document.documentElement;

afterEach(() => {
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
});

describe('computer players', () => {
  it.each(legacy)('marks what the original marked: $name', scenario => {
    const players = readComputerPlayers(scenario.text);
    markComputerPlayers(players);
    expect(root.dataset.cdcAi ?? null).toBe(scenario.ai);
    expect(root.style.getPropertyValue('--cdc-ai-white') || null).toBe(scenario.white);
    expect(root.style.getPropertyValue('--cdc-ai-black') || null).toBe(scenario.black);
    const rated = Object.fromEntries(
      players.flatMap(({ color, rating }) =>
        rating === undefined ? [] : [[color, String(rating)]],
      ),
    );
    expect(rated).toEqual(scenario.ratings);
  });

  it('keeps the ratings for the game info, in the order of the data', async () => {
    vi.resetModules();
    const fresh = await import('./ai-players.ts');
    fresh.markComputerPlayers(fresh.readComputerPlayers(legacy[1]?.text ?? null));
    expect([...fresh.computerRatings()]).toEqual([
      ['white', '3000'],
      ['black', '800'],
    ]);
  });

  it('reads the init data once the page is parsed, and only while it parses', async () => {
    vi.resetModules();
    const { aiPlayers } = await import('./ai-players.ts');
    aiPlayers.start();
    setReadyState('loading');
    aiPlayers.start();
    const script = document.createElement('script');
    script.id = 'page-init-data';
    script.textContent = legacy[0]?.text ?? '';
    document.body.append(script);
    await Promise.resolve();
    script.remove();
    expect(root.dataset.cdcAi).toBeUndefined();
    restoreReadyState();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(root.dataset.cdcAi).toBe(legacy[0]?.ai);
    expect(root.style.getPropertyValue('--cdc-ai-black')).toBe(legacy[0]?.black);
  });

  it('reads nothing without init data', () => {
    expect(readComputerPlayers(null)).toEqual([]);
  });
});
