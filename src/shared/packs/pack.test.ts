import { describe, expect, it } from 'vitest';
import { fakePack } from '#shared/testing/packs.ts';
import { hasPart, PackSchema, pieceOf, pieceVariable } from './pack.ts';

describe('PackSchema', () => {
  const pack = fakePack('ann/packs/main/wood/');

  it('reads back a stored pack', () => {
    expect(PackSchema.parse(pack)).toEqual(pack);
  });

  it.each([
    // Into a stylesheet: nothing that could close the url().
    ['an image that leaves its url()', { board: { image: 'data:image/png;base64,AAAA") }' } }],
    ['an image of another scheme', { board: { image: 'https://example.com/b.png' } }],
    // atob turns these down, and the sounds go through it on every page.
    ['a sound of broken base64', { sounds: { capture: 'data:audio/mpeg;base64,abc_' } }],
    ['a sound cut short', { sounds: { capture: 'data:audio/mpeg;base64,abcde' } }],
    ['a color that isn’t one', { board: { image: 'data:image/png;base64,AAAA', light: 'red;x' } }],
  ])('turns down %s', (_, change) => {
    expect(PackSchema.safeParse({ ...pack, ...change }).success).toBe(false);
  });

  it('reads a file of many megabytes without overflowing', () => {
    const image = `data:image/png;base64,${'A'.repeat(24 * 1024 * 1024)}`;
    expect(PackSchema.safeParse({ ...pack, board: { image } }).success).toBe(true);
  });
});

describe('the pieces', () => {
  it('are named as Lichess names them, and drawn from its variables', () => {
    expect(pieceOf('wN')).toEqual({ color: 'white', role: 'knight' });
    expect(pieceOf('bK')).toEqual({ color: 'black', role: 'king' });
    expect(pieceVariable('bP')).toBe('---black-pawn');
  });
});

describe('hasPart', () => {
  it('counts sounds only when there are some', () => {
    const sounds = fakePack('ann/packs/main/clicks/', ['sound']);
    expect([hasPart(sounds, 'board'), hasPart(sounds, 'piece'), hasPart(sounds, 'sound')]).toEqual([
      false,
      false,
      true,
    ]);
    expect(hasPart({ ...sounds, sounds: {} }, 'sound')).toBe(false);
  });
});
