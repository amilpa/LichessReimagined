// The extension APIs the content script uses, in one place.

/** A bundled file's URL, from its path in public/ (`img/…`). */
export const extensionUrl = (path: string): string => chrome.runtime.getURL(path);

/** Whether this content script still belongs to a running extension (not orphaned by a reload). */
export const isConnected = (): boolean => chrome.runtime?.id !== undefined;

/** Sends the background worker a message, and its answer, unchecked. */
export const askWorker = (message: unknown): Promise<unknown> =>
  chrome.runtime.sendMessage<unknown, unknown>(message);
