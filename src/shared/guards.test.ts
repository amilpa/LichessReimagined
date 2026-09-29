import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { createGuard } from './guards.ts';

describe('createGuard', () => {
  it('narrows the live object itself, and checks it once', () => {
    const schema = z.object({ ply: z.number() });
    const parse = vi.spyOn(schema, 'safeParse');
    const isNode = createGuard(schema);
    const node = { ply: 3, extra: true };
    expect(isNode(node)).toBe(true);
    expect(isNode(node)).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(isNode({ ply: '3' })).toBe(false);
    expect(isNode(null)).toBe(false);
  });

  it('checks a primitive every time, as there is nothing to remember it by', () => {
    const isName = createGuard(z.string());
    expect(isName('a')).toBe(true);
    expect(isName(1)).toBe(false);
  });

  it('turns away a schema that rewrites the value, as the guard hands back the input', () => {
    // A type-level check: with a transform, a string would pass as its length.
    const length = z.pipe(
      z.string(),
      z.transform(value => value.length),
    );
    expectTypeOf(length).not.toExtend<Parameters<typeof createGuard<number>>[0]>();
    expectTypeOf(z.number()).toExtend<Parameters<typeof createGuard<number>>[0]>();
  });
});
