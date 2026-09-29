import { reviewArrows } from '#page/board/review-arrows.ts';
import { portAgainstLegacy, type Scenario } from '#page/review/fixtures/review-script.ts';
import type { ReviewSnapshot } from '#page/review/fixtures/review-snapshot.ts';
import { review } from '#page/review/index.ts';

// Each scenario has a test file of its own: a started review can't be stopped
// (its render interval, its resize listener, its analysis still running), so
// each needs a fresh window, which vitest gives per file.

/** What the review shows after each step of `scenario`, by step, for the steps the original recorded. */
export async function portSnapshots(
  scenario: Scenario,
  legacy: Readonly<Record<string, unknown>>,
): Promise<Record<string, ReviewSnapshot | null>> {
  const steps = await portAgainstLegacy(
    scenario,
    { boot: review.start, arrows: reviewArrows },
    legacy,
  );
  return Object.fromEntries(steps.map(({ step, port }) => [step, port]));
}
