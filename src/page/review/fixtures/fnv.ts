// Test support: FNV-1a over UTF-16 code units, as the fixtures were recorded
// with. Kept apart from coach/hash.ts so that changing how the coach picks its
// words doesn't change the fake engine's scores.

export function fnv(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
