import { z } from 'zod/mini';

// A feature often acts differently while the page parses: tests set the
// document's readyState rather than wait for a real parse.

/** A readyState as a fixture records it. */
export const ReadyStateSchema = z.enum(['loading', 'interactive', 'complete']);

export function setReadyState(state: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', { value: state, configurable: true });
}

/** Back to happy-dom's own readyState. */
export function restoreReadyState(): void {
  Reflect.deleteProperty(document, 'readyState');
}
