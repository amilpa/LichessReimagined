import { chromium, expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { watchExtensionErrors, type ExtensionError } from './support/errors.ts';
import { assertBuilt, DESKTOP_CHROME, LAUNCH_ARGS } from './support/extension.ts';

// Every test runs in a fresh Chromium profile with the built extension loaded,
// as a user would have it, and fails if the extension's scripts throw or log
// an error on any of its pages.

interface ExtensionFixtures {
  /** What the extension threw or logged on the test's pages so far. */
  extensionErrors: ExtensionError[];
  context: BrowserContext;
  page: Page;
}

const errorsByContext = new WeakMap<BrowserContext, ExtensionError[]>();

export const test = base.extend<ExtensionFixtures>({
  baseURL: 'https://lichess.org',
  viewport: { width: 1366, height: 768 },
  colorScheme: 'dark',
  context: async ({ baseURL, viewport, locale, colorScheme, reducedMotion }, use) => {
    assertBuilt();
    // `channel: 'chromium'` is what loads extensions: Playwright's default
    // headless shell drops them without a word.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [...LAUNCH_ARGS],
      // Headless, Playwright hides the scrollbars: a layout that only fits
      // without them would pass here and overflow in a real Chrome.
      ignoreDefaultArgs: ['--hide-scrollbars'],
      userAgent: DESKTOP_CHROME,
      ...(baseURL === undefined ? {} : { baseURL }),
      viewport,
      colorScheme,
      reducedMotion,
      ...(locale === undefined ? {} : { locale }),
    });
    const errors: ExtensionError[] = [];
    errorsByContext.set(context, errors);
    context.on('page', page => watchExtensionErrors(page, errors));
    // The blank tab a persistent context opens with was there before the listener.
    for (const page of context.pages()) watchExtensionErrors(page, errors);
    await use(context);
    await context.close();
    expect(errors, 'errors from the extension’s scripts').toEqual([]);
  },
  extensionErrors: async ({ context }, use) => {
    await use(errorsByContext.get(context) ?? []);
  },
  page: async ({ context }, use) => {
    // A persistent context opens with a blank tab: use it rather than a second one.
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect };
