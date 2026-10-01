import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fakePack } from '#shared/testing/packs.ts';
import { createLibrary, LICHESS, storedPick, type Shown } from './library.ts';
import type { Pack } from '#shared/packs/pack.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const CLICKS = fakePack('ann/packs/main/clicks/', ['sound']);

type Save = (pack: Pack) => Promise<void>;
type Erase = (id: string) => Promise<void>;

function library(
  packs: readonly Pack[],
  stored: readonly Pack[] = packs,
): {
  readonly shown: Shown[];
  readonly save: Mock<Save>;
  readonly erase: Mock<Erase>;
  readonly library: ReturnType<typeof createLibrary>;
} {
  const shown: Shown[] = [];
  const save = vi.fn<Save>(() => Promise.resolve());
  const erase = vi.fn<Erase>(() => Promise.resolve());
  const readAll = (): Promise<readonly Pack[]> => Promise.resolve(stored);
  return {
    shown,
    save,
    erase,
    library: createLibrary({ packs, readAll, save, erase, show: next => shown.push(next) }),
  };
}

const ids = (shown: Shown | undefined): Record<string, string | null> => ({
  board: shown?.board?.id ?? null,
  piece: shown?.piece?.id ?? null,
  sound: shown?.sound?.id ?? null,
});

afterEach(() => {
  localStorage.clear();
});

describe('storedPick', () => {
  it('reads a pack’s id, and anything older or missing as Lichess’s', () => {
    expect(storedPick('board')).toBe(LICHESS);
    localStorage.setItem('cdc-board', WOOD.id);
    // An older version's bundled sets and boards: they're gone.
    localStorage.setItem('cdc-pieces', 'neo');
    localStorage.setItem('cdc-sounds', 'lichess');
    expect([storedPick('board'), storedPick('piece'), storedPick('sound')]).toEqual([
      WOOD.id,
      LICHESS,
      LICHESS,
    ]);
  });
});

describe('createLibrary', () => {
  it('shows Lichess’s own until a pack is picked, then the pick', () => {
    const { shown, library: packs } = library([WOOD, CLICKS]);
    expect(ids(shown.at(-1))).toEqual({ board: null, piece: null, sound: null });
    packs.choose('piece', WOOD.id);
    packs.choose('sound', CLICKS.id);
    expect(ids(shown.at(-1))).toEqual({ board: null, piece: WOOD.id, sound: CLICKS.id });
    expect(localStorage.getItem('cdc-pieces')).toBe(WOOD.id);
    expect([packs.current('board'), packs.current('piece')]).toEqual([LICHESS, WOOD.id]);
    packs.choose('piece', LICHESS);
    expect(ids(shown.at(-1)).piece).toBeNull();
  });

  it('shows Lichess’s for a pick whose pack is gone or lacks the part', () => {
    localStorage.setItem('cdc-board', CLICKS.id);
    localStorage.setItem('cdc-pieces', 'ann/packs/main/gone/');
    const { shown, library: packs } = library([WOOD, CLICKS]);
    expect(ids(shown.at(-1))).toEqual({ board: null, piece: null, sound: null });
    expect(packs.current('board')).toBe(LICHESS);
    // The pick is kept: a pack that failed to read this time may read the next.
    expect(localStorage.getItem('cdc-pieces')).toBe('ann/packs/main/gone/');
  });

  it('stores an imported pack and shows each part it has', async () => {
    localStorage.setItem('cdc-board', WOOD.id);
    const { shown, save, library: packs } = library([WOOD]);
    const listener = vi.fn<() => void>();
    packs.onChange(listener);
    await packs.add(CLICKS);
    expect(save).toHaveBeenCalledWith(CLICKS);
    expect(ids(shown.at(-1))).toEqual({ board: WOOD.id, piece: null, sound: CLICKS.id });
    expect(packs.packs()).toEqual([WOOD, CLICKS]);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('replaces a pack imported again, keeping one of each', async () => {
    const { library: packs } = library([WOOD, CLICKS]);
    const renamed = { ...WOOD, name: 'Wood, again' };
    await packs.add(renamed);
    expect(packs.packs()).toEqual([CLICKS, renamed]);
  });

  it('removes a pack, and the parts it showed go back to Lichess', async () => {
    const { shown, erase, library: packs } = library([WOOD]);
    packs.choose('board', WOOD.id);
    await packs.remove(WOOD.id);
    expect(erase).toHaveBeenCalledWith(WOOD.id);
    expect(packs.packs()).toEqual([]);
    expect(ids(shown.at(-1)).board).toBeNull();
    expect(storedPick('board')).toBe(LICHESS);
    expect(localStorage.getItem('cdc-board')).toBe(LICHESS);
  });

  it('changes nothing when the store fails', async () => {
    const { save, library: packs } = library([]);
    save.mockRejectedValueOnce(new Error('quota'));
    await expect(packs.add(WOOD)).rejects.toThrow('quota');
    expect(packs.packs()).toEqual([]);
    expect(localStorage.getItem('cdc-board')).toBeNull();
  });

  it('reads the other packs once, keeping those already shown as they are', async () => {
    localStorage.setItem('cdc-sounds', CLICKS.id);
    const { shown, library: packs } = library([CLICKS], [WOOD, { ...CLICKS }]);
    expect(packs.packs()).toEqual([CLICKS]);
    await Promise.all([packs.loadAll(), packs.loadAll()]);
    expect(packs.packs().map(pack => pack.id)).toEqual([WOOD.id, CLICKS.id]);
    // The same object: a new one would send its sounds to the page again.
    expect(shown.at(-1)?.sound).toBe(CLICKS);
  });
});
