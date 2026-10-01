import { describe, expect, it, vi } from 'vitest';
import { stockfishScript } from './settings.ts';

// Each test takes a fresh copy of the module: it keeps its answer for the page.
async function detect(): Promise<() => boolean> {
  vi.resetModules();
  return (await import('./relaxed-simd.ts')).hasRelaxedSimd;
}

describe('hasRelaxedSimd', () => {
  it('says yes where the relaxed instruction validates, and asks once', async () => {
    const validate = vi.spyOn(WebAssembly, 'validate').mockReturnValue(true);
    const hasRelaxedSimd = await detect();
    expect(hasRelaxedSimd()).toBe(true);
    expect(hasRelaxedSimd()).toBe(true);
    expect(validate).toHaveBeenCalledTimes(1);
    // A module whose only function uses i32x4.dot_i8x16_i7x16_add_s (0xfd 0x93 0x02).
    const bytes = validate.mock.calls[0]?.[0];
    expect(bytes).toBeInstanceOf(Uint8Array);
    if (!(bytes instanceof Uint8Array)) return;
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0, 97, 115, 109]);
    expect(Array.from(bytes.subarray(-4, -1))).toEqual([253, 147, 2]);
  });

  it('says no where it doesn’t', async () => {
    vi.spyOn(WebAssembly, 'validate').mockReturnValue(false);
    expect((await detect())()).toBe(false);
  });
});

describe('stockfishScript', () => {
  it('takes Lichess’s relaxed SIMD build where the browser runs it, else the plain one', () => {
    expect(stockfishScript(true)).toBe('sf_19_smallnet_relaxed-simd.js');
    expect(stockfishScript(false)).toBe('sf_19_smallnet.js');
  });
});
