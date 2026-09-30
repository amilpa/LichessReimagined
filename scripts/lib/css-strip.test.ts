import { describe, expect, it } from 'vitest';
import { stripCss } from './css-strip.ts';

describe('stripCss', () => {
  it('drops comments, blank lines and indentation', () => {
    const css = '/* Head. */\n\n.a {\n  color: red; /* why */\n\n  /* a line */\n  top: 0;\n}\n';
    expect(stripCss(css)).toBe('.a {\ncolor: red;\ntop: 0;\n}\n');
  });

  it('keeps strings whole, a comment-like one or a continued one', () => {
    const css = '.a::before {\n  content: \'/* not a comment */\';\n  --x: "a\\\n  b";\n}\n';
    expect(stripCss(css)).toBe(
      '.a::before {\ncontent: \'/* not a comment */\';\n--x: "a\\\n  b";\n}\n',
    );
  });

  it('keeps what sits on a line with a comment', () => {
    expect(stripCss('.a/* x */.b { top: 0 }')).toBe('.a.b { top: 0 }\n');
  });
});
