import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { parseJson } from './json.ts';
import { isFrench, pageLang, pageLocale } from './lang.ts';
import { clamp, roundTenth } from './math.ts';
import { nonEmpty } from './text.ts';
import { lenient } from './zod.ts';

afterEach(() => {
  document.documentElement.lang = '';
});

describe('lang', () => {
  it('reads <html lang>, and leaves the locale to the browser when there is none', () => {
    expect(pageLang()).toBe('');
    expect(pageLocale()).toBeUndefined();
    document.documentElement.lang = 'fr-CA';
    expect(pageLocale()).toBe('fr-CA');
    expect(isFrench()).toBe(true);
  });
});

describe('math', () => {
  it('clamps, the low end winning when the ends cross', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(5, 8, 4)).toBe(8);
  });

  it('rounds to a tenth', () => {
    expect(roundTenth(12.349)).toBe(12.3);
    expect(roundTenth(12.35)).toBe(12.4);
    expect(roundTenth(-0.04)).toBe(-0);
  });
});

describe('nonEmpty', () => {
  it('turns an empty or missing text into undefined', () => {
    expect(nonEmpty('a')).toBe('a');
    expect(nonEmpty(' ')).toBe(' ');
    expect(nonEmpty('')).toBeUndefined();
    expect(nonEmpty(null)).toBeUndefined();
    expect(nonEmpty(undefined)).toBeUndefined();
  });
});

describe('lenient', () => {
  it('reads a malformed field as missing, not the whole object as malformed', () => {
    const schema = z.object({ name: z.string(), rating: lenient(z.number()) });
    expect(schema.parse({ name: 'a', rating: 1500 })).toEqual({ name: 'a', rating: 1500 });
    expect(schema.parse({ name: 'a', rating: '1500' })).toEqual({ name: 'a' });
    expect(schema.parse({ name: 'a' })).toEqual({ name: 'a' });
    expect(schema.safeParse({ rating: 1500 }).success).toBe(false);
  });
});

describe('parseJson', () => {
  it('reads valid JSON that fits the schema, else null', () => {
    const schema = z.object({ id: z.string() });
    expect(parseJson('{"id":"x"}', schema)).toEqual({ id: 'x' });
    expect(parseJson('{"id":1}', schema)).toBeNull();
    expect(parseJson('{', schema)).toBeNull();
    expect(parseJson(null, schema)).toBeNull();
    expect(parseJson(undefined, schema)).toBeNull();
  });
});
