import { afterEach, describe, expect, it } from 'vitest';
import { cgKey } from './chessground.ts';
import { method } from './method.ts';
import { readMoveOptions, soundPlayer } from './sound.ts';
import { lastNodeId, parentPath, pathPrefixes } from './tree.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('cgKey', () => {
  it('reads the square chessground keeps on the element', () => {
    const piece = document.createElement('piece');
    expect(cgKey(piece)).toBeNull();
    expect(cgKey(Object.assign(piece, { cgKey: 'e4' }))).toBe('e4');
    expect(cgKey(Object.assign(document.createElement('piece'), { cgKey: 'a0' }))).toBeNull();
    expect(cgKey(Object.assign(document.createElement('piece'), { cgKey: 42 }))).toBeNull();
  });
});

describe('tree paths', () => {
  it('read a path as its nodes’ two-character ids', () => {
    expect(parentPath('')).toBe('');
    expect(parentPath('/?')).toBe('');
    expect(parentPath('/?WG.>')).toBe('/?WG');
    expect(lastNodeId('/?WG.>')).toBe('.>');
    expect(lastNodeId('')).toBe('');
    expect(pathPrefixes('')).toEqual([]);
    expect(pathPrefixes('/?')).toEqual(['/?']);
    expect(pathPrefixes('/?WG.>')).toEqual(['/?', '/?WG', '/?WG.>']);
  });
});

describe('method', () => {
  it('takes a function, and nothing else', () => {
    const schema = method<[path: string]>();
    expect(schema.safeParse((path: string) => path.length).success).toBe(true);
    expect(schema.safeParse('nodeAtPath').success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });
});

const player = (): Record<string, unknown> => ({
  paths: new Map(),
  play: () => Promise.resolve(),
  move: () => Promise.resolve(),
});

describe('soundPlayer', () => {
  it('is the live object, once Lichess has set it up', () => {
    expect(soundPlayer()).toBeNull();
    Object.assign(window, { site: {} });
    expect(soundPlayer()).toBeNull();
    const sound = player();
    Object.assign(window, { site: { sound } });
    expect(soundPlayer()).toBe(sound);
  });

  it('needs its paths and both methods', () => {
    Object.assign(window, { site: { sound: { ...player(), paths: {} } } });
    expect(soundPlayer()).toBeNull();
    Object.assign(window, { site: { sound: { ...player(), move: 'move' } } });
    expect(soundPlayer()).toBeNull();
  });
});

describe('readMoveOptions', () => {
  it('reads what move() is called with, a field of another type as missing', () => {
    expect(
      readMoveOptions({ san: 'Nf3', ply: 1, filter: 'music', volume: 0.5, uci: 'g1f3' }),
    ).toEqual({
      san: 'Nf3',
      ply: 1,
      filter: 'music',
      volume: 0.5,
    });
    expect(readMoveOptions({ name: 'capture', san: null, ply: '3' })).toEqual({ name: 'capture' });
    expect(readMoveOptions(undefined)).toEqual({});
    expect(readMoveOptions(7)).toEqual({});
  });
});
