// Golden tests of large outputs keep a digest of them rather than the whole text.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** JSON with sorted keys, so objects built in another order compare equal (and -0 is 0). */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_key, item: unknown) =>
    isRecord(item)
      ? Object.fromEntries(
          Object.entries(item).toSorted(([first], [second]) => (first < second ? -1 : 1)),
        )
      : item,
  );

/** The SHA-256 of a text, in hex. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
