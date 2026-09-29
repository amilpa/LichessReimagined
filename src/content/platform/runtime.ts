// The extension APIs the content script uses, in one place.

/** A bundled file's URL, from its path in public/ (`img/…`, `sounds/…`). */
export const extensionUrl = (path: string): string => chrome.runtime.getURL(path);

/** Loaded unpacked (development), rather than installed from a store. */
export const isUnpacked = (): boolean => !('update_url' in chrome.runtime.getManifest());

/** Whether this content script still belongs to a running extension (not orphaned by a reload). */
export const isConnected = (): boolean => chrome.runtime?.id !== undefined;
