import { describe, expect, it } from 'vitest';
import { assertNoChromeUrls, toFirefoxCss } from './firefox.ts';

describe('toFirefoxCss', () => {
  it('rewrites the extension URLs to Firefox’s scheme', () => {
    const css = "a { background: url('chrome-extension://__MSG_@@extension_id__/img/x.svg'); }";
    expect(toFirefoxCss(css)).toBe(
      "a { background: url('moz-extension://__MSG_@@extension_id__/img/x.svg'); }",
    );
  });

  it('reports a Chrome URL left behind', () => {
    expect(() => assertNoChromeUrls(new Map([['a.css', 'chrome-extension://abc/x']]))).toThrow(
      /a\.css/,
    );
    expect(() => assertNoChromeUrls(new Map([['a.css', 'moz-extension://abc/x']]))).not.toThrow();
  });
});
