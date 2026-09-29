import type { z } from 'zod/mini';

/**
 * A type guard backed by a schema, for live objects that must keep their
 * identity (a zod parse returns a copy). An object that passed once is
 * remembered, so checking it again is free.
 *
 * It narrows the input, not a parsed copy, so the schema must not rewrite the
 * value: no `lenient`, catch, default or coerce. The signature only rejects
 * transforms and pipes, as zod's types can't tell the others apart.
 *
 * A method described with `z.custom` and `typeof` is only checked to be a
 * function: its parameters and return type are taken on trust.
 */
export function createGuard<T>(schema: z.ZodMiniType<T, T>): (value: unknown) => value is T {
  const passed = new WeakSet<object>();
  return (value: unknown): value is T => {
    const isObject = typeof value === 'object' && value !== null;
    if (isObject && passed.has(value)) return true;
    if (!schema.safeParse(value).success) return false;
    if (isObject) passed.add(value);
    return true;
  };
}
