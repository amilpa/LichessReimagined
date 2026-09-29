/** The text, or undefined when it's empty or missing: for `??` fallbacks that skip ''. */
export const nonEmpty = (text: string | null | undefined): string | undefined =>
  text === null || text === '' ? undefined : text;
