/** The variants the review can judge: the engine plays standard chess only. */
export const REVIEWED_VARIANTS: ReadonlySet<string> = new Set([
  'standard',
  'fromPosition',
  'chess960',
]);
