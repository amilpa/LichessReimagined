// Every reduced-motion query answers as if the user asked for nothing:
// `reduce` never matches, `no-preference` always does.

const REDUCED_MOTION = /\(\s*prefers-reduced-motion\s*(?::\s*(reduce|no-preference)\s*)?\)/g;
const ALWAYS = '(width >= 0)';
const NEVER = '(width < 0)';

export function unreducedQuery(query: string): string {
  return query.replace(REDUCED_MOTION, (_match: string, value: string | undefined) =>
    value === 'no-preference' ? ALWAYS : NEVER,
  );
}

/** Rewrites the reduced-motion media rules, nested ones too. Whether there was any. */
export function rewriteRules(rules: CSSRuleList): boolean {
  let rewritten = false;
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('prefers-reduced-motion')) {
      rule.media.mediaText = unreducedQuery(rule.media.mediaText);
      rewritten = true;
    }
    if (rule instanceof CSSGroupingRule) rewritten = rewriteRules(rule.cssRules) || rewritten;
  }
  return rewritten;
}
