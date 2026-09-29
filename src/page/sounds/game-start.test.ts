import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { createElement } from '#shared/dom.ts';
import type { SoundName } from '#shared/sounds.ts';
import { setReadyState } from '#shared/testing/ready-state.ts';
import { freshGameId, watchGameStart } from './game-start.ts';
import { createSession, type SoundSession } from './session.ts';
// Whether the original played the game start for each page, in this order.
import legacy from './fixtures/legacy-game-start.json' with { type: 'json' };

const CaseSchema = z.object({
  name: z.string(),
  text: z.string(),
  played: z.nullable(z.array(z.unknown())),
  stored: z.array(z.string()),
});

const cases = z.array(CaseSchema).parse(legacy);

function addInitData(text: string): void {
  const script = createElement('script', { id: 'page-init-data', text });
  script.type = 'application/json';
  document.body.append(script);
}

function listen(session: SoundSession, played: SoundName[]): void {
  session.playOurs = name => played.push(name);
}

afterEach(() => {
  document.body.replaceChildren();
  setReadyState('complete');
});

describe('freshGameId', () => {
  it('reads the round data', () => {
    expect(freshGameId(cases[0]?.text ?? null)).toBe('abcd1234');
    expect(freshGameId(null)).toBeNull();
  });
});

describe('watchGameStart', () => {
  it('plays once per game when the original did, whichever of the game and the sounds comes first', () => {
    sessionStorage.clear();
    const outcomes = [];
    for (const [index, entry] of cases.entries()) {
      addInitData(entry.text);
      const session = createSession();
      const soundsFirst = index % 2 === 0;
      const played: SoundName[] = [];
      if (soundsFirst) listen(session, played);
      const gameStart = watchGameStart(session);
      if (!soundsFirst) {
        listen(session, played);
        gameStart.play();
      }
      outcomes.push({
        name: entry.name,
        played: played.length > 0,
        stored: Object.keys(sessionStorage).toSorted(),
      });
      document.body.replaceChildren();
    }
    expect(outcomes).toEqual(
      cases.map(({ name, played, stored }) => ({ name, played: played !== null, stored })),
    );
  });

  it('reads the data once the page is parsed', async () => {
    sessionStorage.clear();
    setReadyState('loading');
    const session = createSession();
    const played: SoundName[] = [];
    listen(session, played);
    watchGameStart(session);
    addInitData(cases[0]?.text ?? '');
    // Let the observer see the node, which Lichess then takes out.
    await Promise.resolve();
    document.body.replaceChildren();
    expect(played).toEqual([]);
    setReadyState('interactive');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(played).toEqual(['game-start']);
  });
});
