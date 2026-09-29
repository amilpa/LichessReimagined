import { vi } from 'vitest';

/**
 * Records the listeners added to `targets` from now on. The returned function
 * removes them, so a feature started in one test doesn't answer in the next.
 */
export function trackListeners(...targets: readonly EventTarget[]): () => void {
  const spies = targets.map(target => ({ target, spy: vi.spyOn(target, 'addEventListener') }));
  return () => {
    for (const { target, spy } of spies) {
      for (const [type, listener, options] of spy.mock.calls)
        target.removeEventListener(type, listener, options);
    }
  };
}
