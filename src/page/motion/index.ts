import type { Feature } from '#shared/features.ts';
import { unreducedQuery } from './queries.ts';
import { copyStylesheets } from './sheets.ts';

// Motion is never reduced. Under `prefers-reduced-motion: reduce` Lichess's
// site CSS turns every transition and animation off, ours included, and its
// scripts ask `matchMedia` too. Runs first, at document_start, so both see
// our answer from the start.

function unreduceMatchMedia(): void {
  const nativeMatchMedia = window.matchMedia.bind(window);
  // Coerced as the native one does: its callers are untyped.
  window.matchMedia = (query: unknown): MediaQueryList =>
    nativeMatchMedia(unreducedQuery(String(query)));
}

export const motion: Feature = {
  name: 'motion',
  start: () => {
    unreduceMatchMedia();
    copyStylesheets();
  },
};
