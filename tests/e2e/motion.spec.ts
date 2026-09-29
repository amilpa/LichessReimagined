import { expect, test } from './fixtures.ts';
import { openLichess } from './support/lichess.ts';

// Motion is never reduced. Under `prefers-reduced-motion: reduce`, as the
// user's own Chrome reports, Lichess turns every animation and transition
// off, ours included, and its scripts ask matchMedia: the extension answers
// both as if the user had asked for nothing.

test.use({ reducedMotion: 'reduce' });

test.describe('with reduced motion asked for', () => {
  test.beforeEach(async ({ page }) => {
    await openLichess(page, '/practice');
  });

  test('matchMedia says motion isn’t reduced', async ({ page }) => {
    const answers = await page.evaluate(() => ({
      reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
      noPreference: matchMedia('(prefers-reduced-motion: no-preference)').matches,
      bare: matchMedia('(prefers-reduced-motion)').matches,
    }));
    expect(answers).toEqual({ reduce: false, noPreference: true, bare: false });
  });

  test('animations run, Lichess’s reduced-motion rule notwithstanding', async ({ page }) => {
    // Lichess's `animation: none !important` would stop this one: it isn't
    // !important itself (styles/practice.css).
    const decoration = page.locator('.practice-side__decoration');
    await expect(decoration).toBeVisible();
    const animations = (): Promise<string[]> =>
      decoration.evaluate(element =>
        element.getAnimations().map(animation => animation.constructor.name),
      );
    await expect.poll(animations).toContain('CSSAnimation');
    // The control: the extension switched Lichess's own sheets off for its
    // rewritten copies, and switching them back on stops the animation.
    await page.evaluate(() => {
      for (const link of document.querySelectorAll('link[rel="stylesheet"]'))
        if (link instanceof HTMLLinkElement && link.disabled) link.disabled = false;
    });
    await expect.poll(animations).toEqual([]);
  });

  test('a card’s hover transition still runs', async ({ page }) => {
    const card = page.locator('.practice-app .study').first();
    await expect(card).toBeVisible();
    const started = await card.evaluateHandle(element => {
      const properties: string[] = [];
      element.addEventListener('transitionrun', event => {
        if (event instanceof TransitionEvent && event.target === element)
          properties.push(event.propertyName);
      });
      return properties;
    });
    await card.hover();
    await expect.poll(() => started.evaluate(properties => [...properties])).toContain('transform');
  });
});
