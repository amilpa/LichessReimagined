import type { z } from 'zod/mini';

/** Parses JSON and validates it, or returns null if either step fails. */
export function parseJson<T>(text: string | null | undefined, schema: z.ZodMiniType<T>): T | null {
  if (text === null || text === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}
