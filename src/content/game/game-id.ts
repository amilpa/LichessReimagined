/** The game id a path starts with (`/abcd1234/black`), if any. */
export const gameIdFrom = (path: string): string | null =>
  /^\/([A-Za-z0-9]{8})/.exec(path)?.[1] ?? null;
