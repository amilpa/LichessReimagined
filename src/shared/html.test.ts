import { describe, expect, expectTypeOf, it } from 'vitest';
import { escapeHtml, html, type SafeHtml, setHtml, trustedHtml } from './html.ts';

describe('html', () => {
  it('escapes what it interpolates, but not nested html', () => {
    const name = '<b>"Tom" & \'Jerry\'</b>';
    const inner = html`<i>${name}</i>`;
    expect(html`<p title="${name}">${inner}</p>`.value).toBe(
      '<p title="&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;">' +
        '<i>&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;</i></p>',
    );
  });

  it('writes numbers, joins lists, and drops false, null and undefined', () => {
    const items = [1, 2].map(value => html`<li>${value}</li>`);
    expect(html`<ul>${items}${false}${null}${undefined}</ul>`.value).toBe(
      '<ul><li>1</li><li>2</li></ul>',
    );
  });

  it('keeps trusted markup as it is', () => {
    expect(html`${trustedHtml('<br>')}`.value).toBe('<br>');
    expect(escapeHtml('a < b')).toBe('a &lt; b');
    const host = document.createElement('div');
    setHtml(host, html`<span>${'<x>'}</span>`);
    expect(host.innerHTML).toBe('<span>&lt;x&gt;</span>');
  });

  it('takes no lookalike for its output, so page text can’t skip the escaping', () => {
    // A type-level check.
    expectTypeOf<{ value: string; toString: () => string }>().not.toExtend<SafeHtml>();
    expectTypeOf(html`<br>`).toExtend<SafeHtml>();
  });
});
